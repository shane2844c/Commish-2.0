export function logSupabasePayload(table: string, payload: unknown) {
  console.log(`[supabase] ${table} payload:`, JSON.stringify(payload, null, 2));
}

export function logSupabaseError(table: string, error: unknown) {
  console.error(`[supabase] ${table} error:`, JSON.stringify(error, null, 2));
}
