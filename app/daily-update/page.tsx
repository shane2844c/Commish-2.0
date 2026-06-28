import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import DailyEntryForm from "@/components/DailyEntryForm";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMonthYear } from "@/lib/types";

export default async function DailyUpdatePage() {
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

  const { month, year } = getCurrentMonthYear();
  const { data: setup } = await supabase
    .from("consultant_months")
    .select("id")
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  return (
    <DashboardShell userName={profile?.full_name} activeItem="daily-update">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-[var(--foreground)]">Daily Update</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Add today&apos;s contacts, sales points, and average GWP.
        </p>
      </div>
      {!setup ? (
        <div className="rounded-xl border border-[var(--border)] bg-white p-8 text-center shadow-[0_6px_18px_rgba(0,74,147,0.08)]">
          <p className="text-sm text-[var(--muted)]">
            Set your starting data first before logging daily updates.
          </p>
          <Link
            href="/setup"
            className="mt-6 inline-block rounded-lg bg-[var(--brand)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)]"
          >
            Go to Starting Data
          </Link>
        </div>
      ) : (
        <DailyEntryForm consultantMonthId={setup.id} />
      )}
    </DashboardShell>
  );
}
