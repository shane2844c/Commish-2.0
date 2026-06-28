import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { createClient } from "@/lib/supabase/server";

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
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <DashboardShell userName={profile?.full_name} activeItem="settings">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-[var(--foreground)]">Settings</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Configure personal dashboard and notification preferences.
        </p>
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-white p-8 shadow-[0_6px_18px_rgba(0,74,147,0.08)]">
        <p className="text-sm text-[var(--muted)]">
          Settings controls can be added here without changing core sales logic.
        </p>
      </div>
    </DashboardShell>
  );
}
