// Page-level offline outbox for driver delivery mutations.
//
// Queued mutations are persisted in IndexedDB (proof photos are large data
// URLs, far beyond localStorage quotas) and replayed in FIFO order when the
// browser comes back online. Entries are queued ONLY for network-level
// failures (fetch rejected) or the service worker's offline 503 fallback —
// real 4xx/5xx server rejections are never queued.

export type OutboxKind = 'status' | 'proof' | 'issue';

export interface OutboxRequest {
  url: string;
  method: string;
  body: string;
}

/**
 * A photo captured offline that still needs to be uploaded to /api/upload
 * before the queued proof submission can carry a real storage URL. On replay
 * the upload runs first and the returned URL is substituted into the request
 * body at `field`; if the server rejects the upload outright (4xx), the raw
 * data URL is substituted instead so the proof is never lost.
 */
export interface PendingUpload {
  field: 'proofUrl' | 'signatureUrl';
  dataUrl: string;
  context: 'pickup' | 'dropoff' | 'signature';
  deliveryId: string;
}

export interface OutboxEntryInput {
  kind: OutboxKind;
  deliveryId: string;
  request: OutboxRequest;
  /** Uploads that must complete before this (proof) request is submitted. */
  pendingUploads?: PendingUpload[];
}

export interface OutboxEntry extends OutboxEntryInput {
  id: string;
  createdAt: number;
  /** FIFO ordering counter assigned by the store (IndexedDB autoIncrement). */
  seq: number;
}

export interface OutboxStore {
  add(entry: Omit<OutboxEntry, 'seq'>): Promise<OutboxEntry>;
  /** All entries in FIFO (ascending seq) order. */
  all(): Promise<OutboxEntry[]>;
  remove(id: string): Promise<void>;
  /**
   * Optional: persist in-place changes to an entry (same seq/id). Used to
   * save pending-upload progress so a completed upload is not repeated when a
   * later step of the same entry fails and the pass halts.
   */
  update?(entry: OutboxEntry): Promise<void>;
}

export interface ReplayResult {
  /** Entries the server accepted (2xx); removed from the queue. */
  replayed: OutboxEntry[];
  /** Entries the server rejected with a 4xx; removed, but surfaced to the UI. */
  dropped: Array<{ entry: OutboxEntry; message: string }>;
  /**
   * Proof entries whose pending photo upload was rejected by the server
   * (real 4xx). The proof was still submitted with the raw data URL so it is
   * not lost, but the rejection is surfaced to the UI.
   */
  uploadFallbacks: Array<{ entry: OutboxEntry; message: string }>;
  /** Entries still queued after this pass. */
  remaining: number;
}

type OutboxResponse = { ok: boolean; status: number; json(): Promise<unknown> };
export type OutboxFetch = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string }
) => Promise<OutboxResponse>;

/** True when a response is the service worker's offline 503 fallback rather than a real server rejection. */
export function isOfflineApiError(status: number, body: unknown): boolean {
  if (status !== 503 || body === null || typeof body !== 'object') return false;
  const error = (body as Record<string, unknown>).error;
  return typeof error === 'string' && /offline/i.test(error);
}

export function extractApiErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const error = (body as Record<string, unknown>).error;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
      const message = (error as Record<string, unknown>).message;
      if (typeof message === 'string') return message;
    }
  }
  return fallback;
}

const UPLOAD_URL = '/api/upload';

/** Re-serialize a JSON request body with one field replaced. */
function withBodyField(body: string, field: string, value: string): string {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body) as Record<string, unknown>;
  } catch {
    parsed = {};
  }
  parsed[field] = value;
  return JSON.stringify(parsed);
}

function newEntryId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `outbox-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export class OfflineOutbox {
  private replayChain: Promise<unknown> = Promise.resolve();

  constructor(
    private readonly store: OutboxStore,
    private readonly fetchFn: OutboxFetch = (url, init) => fetch(url, init)
  ) {}

  enqueue(input: OutboxEntryInput): Promise<OutboxEntry> {
    return this.store.add({ ...input, id: newEntryId(), createdAt: Date.now() });
  }

  async entriesFor(deliveryId: string): Promise<OutboxEntry[]> {
    return (await this.store.all()).filter((entry) => entry.deliveryId === deliveryId);
  }

  /** Replay queued entries in FIFO order. Concurrent calls are serialized so an entry is never replayed twice at once. */
  replay(): Promise<ReplayResult> {
    const run = this.replayChain.then(
      () => this.replayPass(),
      () => this.replayPass()
    );
    this.replayChain = run.catch(() => undefined);
    return run;
  }

  /**
   * Run the pending uploads for a proof entry, substituting each returned URL
   * into the entry's request body. Mutates `entry` and persists progress so a
   * completed upload is never repeated on a later pass.
   *
   * Returns 'halt' when an upload could not reach the server (network error,
   * SW offline 503, or genuine 5xx) — the entry stays queued and the caller
   * must stop the pass to preserve FIFO order.
   */
  private async resolvePendingUploads(
    entry: OutboxEntry,
    uploadFallbacks: ReplayResult['uploadFallbacks']
  ): Promise<'resolved' | 'halt'> {
    const pending = [...(entry.pendingUploads ?? [])];

    while (pending.length > 0) {
      const upload = pending[0]!;
      let response: OutboxResponse;
      try {
        response = await this.fetchFn(UPLOAD_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataUrl: upload.dataUrl,
            context: upload.context,
            deliveryId: upload.deliveryId,
          }),
        });
      } catch {
        return 'halt'; // Still offline.
      }

      const body = await response.json().catch(() => null);
      if (isOfflineApiError(response.status, body)) return 'halt';

      const url =
        response.ok && body && typeof body === 'object'
          ? (body as Record<string, unknown>).url
          : undefined;

      if (typeof url === 'string') {
        entry.request.body = withBodyField(entry.request.body, upload.field, url);
      } else if (response.ok || (response.status >= 400 && response.status < 500)) {
        // The server made a real decision (or returned a malformed success) —
        // fall back to submitting the raw data URL so the proof is not lost.
        entry.request.body = withBodyField(entry.request.body, upload.field, upload.dataUrl);
        uploadFallbacks.push({
          entry,
          message: extractApiErrorMessage(body, `Photo upload failed (${response.status})`),
        });
      } else {
        return 'halt'; // Genuine 5xx: retry this upload on the next pass.
      }

      pending.shift();
      entry.pendingUploads = pending.length > 0 ? [...pending] : undefined;
      await this.store.update?.(entry);
    }

    return 'resolved';
  }

  private async replayPass(): Promise<ReplayResult> {
    const replayed: OutboxEntry[] = [];
    const dropped: ReplayResult['dropped'] = [];
    const uploadFallbacks: ReplayResult['uploadFallbacks'] = [];

    for (const entry of await this.store.all()) {
      if (entry.kind === 'proof' && entry.pendingUploads && entry.pendingUploads.length > 0) {
        const outcome = await this.resolvePendingUploads(entry, uploadFallbacks);
        if (outcome === 'halt') break; // Keep this entry and everything after it.
      }

      let response: OutboxResponse;
      try {
        response = await this.fetchFn(entry.request.url, {
          method: entry.request.method,
          headers: { 'Content-Type': 'application/json' },
          body: entry.request.body,
        });
      } catch {
        break; // Still offline — keep this entry and everything after it.
      }

      const body = await response.json().catch(() => null);
      if (isOfflineApiError(response.status, body)) {
        break; // The SW's offline 503 means the request never reached the server.
      }

      if (response.ok) {
        await this.store.remove(entry.id);
        replayed.push(entry);
        continue;
      }

      if (response.status >= 400 && response.status < 500) {
        // The server made a real decision (e.g. a transition that is no longer
        // valid) — drop the entry but tell the caller why.
        await this.store.remove(entry.id);
        dropped.push({
          entry,
          message: extractApiErrorMessage(body, `Request failed (${response.status})`),
        });
        continue;
      }

      break; // Genuine 5xx: keep FIFO order intact and retry on the next replay.
    }

    return { replayed, dropped, uploadFallbacks, remaining: (await this.store.all()).length };
  }
}

const DB_NAME = 'ridendine-driver-outbox';
const DB_VERSION = 1;
const STORE_NAME = 'mutations';

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'seq', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open outbox database'));
  });
}

export function createIndexedDbStore(): OutboxStore {
  let dbPromise: Promise<IDBDatabase> | null = null;
  const objectStore = async (mode: IDBTransactionMode) => {
    dbPromise ??= openDatabase();
    return (await dbPromise).transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  };

  return {
    async add(entry) {
      const seq = await promisify((await objectStore('readwrite')).add(entry));
      return { ...entry, seq: seq as number };
    },
    async all() {
      const rows = (await promisify((await objectStore('readonly')).getAll())) as OutboxEntry[];
      return rows.sort((a, b) => a.seq - b.seq);
    },
    async remove(id) {
      const store = await objectStore('readwrite');
      const rows = (await promisify(store.getAll())) as OutboxEntry[];
      const match = rows.find((row) => row.id === id);
      if (match) await promisify(store.delete(match.seq));
    },
    async update(entry) {
      // keyPath is `seq`, so put() replaces the row in place, preserving FIFO.
      await promisify((await objectStore('readwrite')).put(entry));
    },
  };
}

let sharedOutbox: OfflineOutbox | null = null;

/** Shared app-wide outbox instance backed by IndexedDB. */
export function getOfflineOutbox(): OfflineOutbox {
  sharedOutbox ??= new OfflineOutbox(createIndexedDbStore());
  return sharedOutbox;
}
