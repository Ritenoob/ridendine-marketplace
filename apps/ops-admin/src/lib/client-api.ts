'use client';

export type ApiEnvelope<T> =
  | { success?: boolean; data?: T; error?: string | { message?: string } }
  | T;

function getErrorMessage(input: unknown, fallback: string) {
  if (input && typeof input === 'object' && 'error' in input) {
    const error = (input as { error?: unknown }).error;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string') return message;
    }
  }
  return fallback;
}

export function unwrapApiItems<T>(payload: unknown): T[] {
  const data =
    payload && typeof payload === 'object' && 'data' in payload
      ? (payload as { data?: unknown }).data
      : payload;

  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: T[] }).items;
  }
  return [];
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit, fallback = 'Request failed') {
  const response = await fetch(input, init);
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok || (payload && typeof payload === 'object' && 'success' in payload && payload.success === false)) {
    throw new Error(getErrorMessage(payload, fallback));
  }
  return payload;
}

export async function fetchApiItems<T>(input: RequestInfo | URL, init?: RequestInit, fallback?: string) {
  const payload = await fetchJson<unknown>(input, init, fallback);
  return unwrapApiItems<T>(payload);
}
