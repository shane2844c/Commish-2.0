import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { hasUsername } from "@/lib/profiles/usernameValidation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ShellLayout({
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (!hasUsername(profile?.username)) {
    redirect("/setup-username");
  }

  return <AppShell userName={profile?.username?.trim() ?? null}>{children}</AppShell>;
}
