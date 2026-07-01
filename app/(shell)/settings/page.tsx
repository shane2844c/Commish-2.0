import UsernameForm from "@/components/UsernameForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
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

  const username = profile?.username?.trim() ?? "";

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-[var(--foreground)]">Settings</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Manage your account preferences.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-[0_6px_18px_rgba(0,74,147,0.08)]">
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
      </div>
    </>
  );
}
