import type { SupabaseClient, User } from "@supabase/supabase-js";
import { logSupabasePayload, logSupabaseError } from "@/lib/supabase/logPayload";

export type AuthResult =
  | { ok: true; user: User }
  | { ok: false; error: string; status: 401 };

export type ParentUserResult =
  | { ok: true; profileExists: boolean }
  | { ok: false; error: string };

export async function requireAuthenticatedUser(supabase: SupabaseClient): Promise<AuthResult> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  console.log("[supabase] logged in user id:", user?.id ?? "none");

  if (error || !user) {
    console.error("[supabase] auth error:", error?.message ?? "No logged-in user");
    return { ok: false, error: "You must be logged in.", status: 401 };
  }

  return { ok: true, user };
}

export async function ensureParentUserRows(
  supabase: SupabaseClient,
  user: User
): Promise<ParentUserResult> {
  const profilePayload = {
    id: user.id,
    email: user.email ?? null,
  };

  logSupabasePayload("profiles", profilePayload);

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .upsert(profilePayload, { onConflict: "id" })
    .select("id")
    .single();

  if (profileError) {
    logSupabaseError("profiles", profileError);
    return { ok: false, error: profileError.message };
  }

  console.log("[supabase] profiles save success:", profileRow);
  console.log("[supabase] parent table row exists (profiles):", Boolean(profileRow?.id));

  return { ok: true, profileExists: Boolean(profileRow?.id) };
}
