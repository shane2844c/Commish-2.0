import { AppCard, AppPage } from "@/components/app";
import UsernameForm from "@/components/UsernameForm";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthenticated");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const username = profile?.username?.trim() ?? "";

  return (
    <AppPage title="Settings" description="Manage your account preferences.">
      <AppCard className="p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Username</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Your username is shown in the header, sidebar, and leaderboard.
        </p>
        <div className="mt-6 max-w-md">
          <UsernameForm
            initialUsername={username}
            submitLabel="Save username"
            showCurrentUsername={Boolean(username)}
          />
        </div>
      </AppCard>
    </AppPage>
  );
}
