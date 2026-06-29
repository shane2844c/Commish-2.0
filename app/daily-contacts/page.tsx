import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import DailyContactsManager from "@/components/DailyContactsManager";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMonthYear, toMonthStart, type ContactOutcomeRow, type ContactTypeRow } from "@/lib/types";

type DailyContactJoinedRow = {
  id: string;
  entry_date: string;
  created_at: string;
  sales_points: number;
  hidden_total_gwp: number;
  contact_type:
    | Pick<ContactTypeRow, "slug" | "name" | "points">
    | Array<Pick<ContactTypeRow, "slug" | "name" | "points">>
    | null;
  outcome:
    | Pick<ContactOutcomeRow, "slug" | "name">
    | Array<Pick<ContactOutcomeRow, "slug" | "name">>
    | null;
};

export default async function DailyContactsPage() {
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
  const monthStart = toMonthStart(month, year);
  const { data: consultantMonth } = await supabase
    .from("consultant_months")
    .select("id")
    .eq("user_id", user.id)
    .eq("month_start", monthStart)
    .maybeSingle();

  const today = new Date().toISOString().slice(0, 10);

  if (!consultantMonth) {
    return (
      <DashboardShell userName={profile?.full_name} activeItem="daily-contacts">
        <div className="mb-8">
          <h2 className="text-3xl font-semibold text-[var(--foreground)]">Daily Contacts</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Log each contact and outcome from this page.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-white p-8 text-center shadow-[0_6px_18px_rgba(0,74,147,0.08)]">
          <p className="text-sm text-[var(--muted)]">
            Set up your Manual Input baseline first before logging daily contacts.
          </p>
          <Link
            href="/setup"
            className="mt-6 inline-block rounded-lg bg-[var(--brand)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)]"
          >
            Go to Manual Input
          </Link>
        </div>
      </DashboardShell>
    );
  }

  const { data: entryRows } = await supabase
    .from("performance_entries")
    .select(
      "id,entry_date,created_at,sales_points,hidden_total_gwp,contact_type:contact_types(slug,name,points),outcome:contact_outcomes(slug,name)"
    )
    .eq("consultant_month_id", consultantMonth.id)
    .eq("source", "daily")
    .order("created_at", { ascending: false });

  const entries =
    ((entryRows ?? []) as unknown as DailyContactJoinedRow[]).map((row) => {
      const type = Array.isArray(row.contact_type) ? row.contact_type[0] : row.contact_type;
      const outcome = Array.isArray(row.outcome) ? row.outcome[0] : row.outcome;
      return {
      id: row.id,
      entryDate: row.entry_date,
      createdAt: row.created_at,
      contactTypeSlug: type?.slug ?? "",
      contactTypeName: type?.name ?? "Unknown",
      contactTypePoints: Number(type?.points ?? 0),
      outcomeSlug: outcome?.slug ?? "",
      outcomeName: outcome?.name ?? "Unknown",
      salesPoints: Number(row.sales_points ?? 0),
      saleGwp: Number(row.hidden_total_gwp ?? 0),
      };
    }) ?? [];

  const todaysEntries = entries.filter((entry) => entry.entryDate === today);
  const contactsLoggedToday = todaysEntries.length;
  const convertedSalesToday = todaysEntries.filter((entry) => entry.salesPoints > 0).length;
  const salesPointsToday = todaysEntries.reduce((sum, entry) => sum + entry.salesPoints, 0);
  const totalGwpToday = todaysEntries.reduce((sum, entry) => sum + entry.saleGwp, 0);
  const averageGwpToday = convertedSalesToday > 0 ? totalGwpToday / convertedSalesToday : 0;

  return (
    <DashboardShell userName={profile?.full_name} activeItem="daily-contacts">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-[var(--foreground)]">Daily Contacts</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Add one contact at a time. Dashboard metrics update from backend calculations only.
        </p>
      </div>
      <DailyContactsManager
        consultantMonthId={consultantMonth.id}
        entries={entries}
        todaySummary={{
          contactsLoggedToday,
          convertedSalesToday,
          salesPointsToday,
          averageGwpToday,
        }}
      />
    </DashboardShell>
  );
}
