import {
  insertOpsProcessorRunClaim,
  updateOpsProcessorRunFinish,
  type SupabaseClient,
} from '@ridendine/db';

type ProcessorClient = {
  from: (table: string) => any;
};

export function processorIdempotencyKey(headers: Headers, processorName: string): string {
  const supplied = headers.get('x-idempotency-key');
  if (supplied && supplied.trim().length >= 8) return supplied.trim();

  const minute = new Date().toISOString().slice(0, 16);
  return `${processorName}:${minute}`;
}

export async function claimProcessorRun(
  client: ProcessorClient,
  processorName: string,
  headers: Headers
): Promise<{ claimed: boolean; runId?: string; idempotencyKey: string; error?: string }> {
  const idempotencyKey = processorIdempotencyKey(headers, processorName);

  try {
    const run = await insertOpsProcessorRunClaim(
      client as unknown as SupabaseClient,
      processorName,
      idempotencyKey
    );
    if (run?.id) {
      return { claimed: true, runId: run.id, idempotencyKey };
    }
    // Duplicate idempotency key (23505) — another invocation owns this slot.
    return { claimed: false, idempotencyKey };
  } catch (error) {
    return {
      claimed: false,
      idempotencyKey,
      error: (error as { message?: string } | null)?.message || 'Failed to claim processor run',
    };
  }
}

export async function finishProcessorRun(
  client: ProcessorClient,
  runId: string | undefined,
  status: 'completed' | 'failed',
  result: Record<string, unknown>,
  errorMessage?: string
): Promise<void> {
  if (!runId) return;
  try {
    await updateOpsProcessorRunFinish(
      client as unknown as SupabaseClient,
      runId,
      status,
      result,
      errorMessage
    );
  } catch {
    // The raw update was fire-and-forget (its error result was ignored);
    // preserve that behaviour so a failed bookkeeping write never fails
    // the processor route itself.
  }
}
