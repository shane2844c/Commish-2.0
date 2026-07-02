import { redirect } from "next/navigation";
import AuthScreen from "@/components/auth/AuthScreen";
import Card from "@/components/ui/Card";
import UsernameForm from "@/components/UsernameForm";
import { hasUsername } from "@/lib/profiles/usernameValidation";
import { createClient } from "@/lib/supabase/server";
import { logSupabaseError } from "@/lib/supabase/logPayload";

export const dynamic = "force-dynamic";

export default async function SetupUsernamePage() {
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
    logSupabaseError("profiles (setup-username)", profileError);
  } else if (hasUsername(profile?.username)) {
    redirect("/dashboard");
  }

  return (
    <AuthScreen>
      <Card className="p-8">
        <h1 className="commish-auth-title text-2xl font-semibold text-[var(--foreground)]">
          Choose your username
        </h1>
        <p className="commish-auth-subtitle mt-2 text-sm text-[var(--muted)]">
          Create a username before accessing the app. This is how you&apos;ll appear on the
          leaderboard and across Commish.
        </p>
        <div className="mt-6">
          <UsernameForm submitLabel="Save username" redirectTo="/dashboard" />
        </div>
      </Card>
    </AuthScreen>
  );
}
