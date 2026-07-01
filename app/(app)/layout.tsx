import { redirect } from "next/navigation";
import { AppShell } from "@/components/app";
import { hasUsername } from "@/lib/profiles/usernameValidation";
import { createClient } from "@/lib/supabase/server";
import { logSupabaseError } from "@/lib/supabase/logPayload";

export const dynamic = "force-dynamic";

/**
 * Shared layout for every authenticated app route.
 * AppShell is rendered here only — never import it from page files.
 */
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    logSupabaseError("profiles (app layout)", profileError);
    redirect("/setup-username");
  }

  if (!hasUsername(profile?.username)) {
    redirect("/setup-username");
  }

  return <AppShell userName={profile?.username?.trim() ?? null}>{children}</AppShell>;
}
