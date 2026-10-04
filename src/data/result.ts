import { insforge } from '@/lib/insforge';

/** The shape every mutation in the data layer returns. */
export type RpcResult = { ok: true } | { ok: false; error: string };
export type ValueResult<T> = { ok: true; value: T } | { ok: false; error: string };

export const NOT_CONFIGURED = 'Backend not configured.';

/**
 * Calls a database function and normalises the answer. Permission is never
 * decided here: every RPC in the schema re-checks the caller's role inside the
 * database, so these wrappers only surface the server's verdict.
 */
export async function callRpc(fn: string, args?: Record<string, unknown>): Promise<RpcResult> {
  if (!insforge) return { ok: false, error: NOT_CONFIGURED };
  try {
    const { error } = await insforge.database.rpc(fn, args ?? {});
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'Request failed. Try again.' }; }
}

/** Same as `callRpc`, but keeps the function's return value. */
export async function callRpcValue<T>(
  fn: string,
  args?: Record<string, unknown>,
): Promise<ValueResult<T>> {
  if (!insforge) return { ok: false, error: NOT_CONFIGURED };
  try {
    const { data, error } = await insforge.database.rpc(fn, args ?? {});
    return error ? { ok: false, error: error.message } : { ok: true, value: data as T };
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'Request failed. Try again.' }; }
}

/** The signed-in user's id, or null when signed out. */
export async function currentUserId(): Promise<string | null> {
  if (!insforge) return null;
  const { data } = await insforge.auth.getCurrentUser();
  return data?.user?.id ?? null;
}
