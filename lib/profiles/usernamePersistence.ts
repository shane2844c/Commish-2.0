import type { SupabaseClient } from "@supabase/supabase-js";
import { logSupabaseError } from "@/lib/supabase/logPayload";
import { hasUsername, validateUsername } from "@/lib/profiles/usernameValidation";

export async function getPostAuthRedirectPath(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    logSupabaseError("profiles", error);
    return "/setup-username";
  }

  return hasUsername(profile?.username) ? "/dashboard" : "/setup-username";
}

export async function saveProfileUsername(
  supabase: SupabaseClient,
  userId: string,
  rawUsername: string
): Promise<{ success?: boolean; error?: string; username?: string }> {
  const validation = validateUsername(rawUsername);
  if (!validation.ok) {
    return { error: validation.error };
  }

  const cleanedUsername = validation.username;

  const { data: existing, error: existingError } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", cleanedUsername)
    .neq("id", userId)
    .maybeSingle();

  if (existingError) {
    logSupabaseError("profiles (username uniqueness check)", existingError);
    return { error: existingError.message };
  }

  if (existing) {
    return { error: "Username is already taken." };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ username: cleanedUsername, updated_at: new Date().toISOString() })
    .eq("id", userId);

  if (updateError) {
    logSupabaseError("profiles (username update)", updateError);
    if (updateError.message.toLowerCase().includes("duplicate") || updateError.code === "23505") {
      return { error: "Username is already taken." };
    }
    return { error: updateError.message };
  }

  return { success: true, username: cleanedUsername };
}
