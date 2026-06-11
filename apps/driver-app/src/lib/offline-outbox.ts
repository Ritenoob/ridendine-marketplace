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

export interface OutboxEntryInput {
  kind: OutboxKind;
  deliveryId: string;
  request: OutboxRequest;
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
}

export interface ReplayResult {
  /** Entries the server accepted (2xx); removed from the queue. */
  replayed: OutboxEntry[];
  /** Entries the server rejected with a 4xx; removed, but surfaced to the UI. */
  dropped: Array<{ entry: OutboxEntry; message: string }>;
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

  private async replayPass(): Promise<ReplayResult> {
    const replayed: OutboxEntry[] = [];
    const dropped: ReplayResult['dropped'] = [];

    for (const entry of await this.store.all()) {
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

    return { replayed, dropped, remaining: (await this.store.all()).length };
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
  };
}

let sharedOutbox: OfflineOutbox | null = null;

/** Shared app-wide outbox instance backed by IndexedDB. */
export function getOfflineOutbox(): OfflineOutbox {
  sharedOutbox ??= new OfflineOutbox(createIndexedDbStore());
  return sharedOutbox;
}
