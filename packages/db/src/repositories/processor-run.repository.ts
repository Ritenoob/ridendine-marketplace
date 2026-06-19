import type { SupabaseClient } from '../client/types';

// ==========================================
// PROCESSOR RUN REPOSITORY
// `ops_processor_runs` — idempotency ledger for cron/engine processors.
// ==========================================

export interface CompletedProcessorRunRow {
  processor_name: string;
  finished_at: string | null;
}

/**
 * Attempt to claim a processor run by inserting a (processor_name,
 * idempotency_key) row in `processing` state.
 *
 * Returns `{ id }` when the claim succeeded, `null` when the unique
 * idempotency key already exists (23505 — someone else claimed this slot),
 * and throws on any other failure.
 */
export async function insertOpsProcessorRunClaim(
  client: SupabaseClient,
  processorName: string,
  idempotencyKey: string
): Promise<{ id: string } | null> {
  const { data, error } = await client
    .from('ops_processor_runs')
    .insert({
      processor_name: processorName,
      idempotency_key: idempotencyKey,
      status: 'processing',
    } as never)
    .select('id')
    .single();

  if (!error && (data as { id?: string } | null)?.id) {
    return { id: (data as { id: string }).id };
  }

  if (error?.code === '23505') {
    return null;
  }

  throw error ?? new Error('Failed to claim processor run');
}

/** Mark a claimed processor run as completed/failed with its result payload. */
export async function updateOpsProcessorRunFinish(
  client: SupabaseClient,
  runId: string,
  status: 'completed' | 'failed',
  result: Record<string, unknown>,
  errorMessage?: string
): Promise<void> {
  const { error } = await client
    .from('ops_processor_runs')
    .update({
      status,
      finished_at: new Date().toISOString(),
      result,
      error_message: errorMessage ?? null,
    } as never)
    .eq('id', runId);

  if (error) throw error;
}

/** Most recently completed processor runs, newest finish first. */
export async function listCompletedProcessorRuns(
  client: SupabaseClient,
  limit = 50
): Promise<CompletedProcessorRunRow[]> {
  const { data, error } = await client
    .from('ops_processor_runs')
    .select('processor_name, finished_at')
    .eq('status', 'completed')
    .order('finished_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as CompletedProcessorRunRow[];
}
