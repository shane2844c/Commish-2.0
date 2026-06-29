import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import ManualInputClient from "@/components/ManualInputClient";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentMonthYear,
  rowToManualInputDefaults,
  toMonthStart,
  type ConsultantMonthRow,
  type ContactTypeRow,
  type ManualInputDefaultValues,
  type PerformanceEntryRow,
} from "@/lib/types";

export default async function SetupPage() {
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

  const { data: existingSetup } = await supabase
    .from("consultant_months")
    .select("*")
    .eq("user_id", user.id)
    .eq("month_start", monthStart)
    .maybeSingle();

  const fallbackDefaults: ManualInputDefaultValues = {
    month,
    year,
    employmentType: "Full-time" as const,
    fullTimePointsTarget: 0,
    fullTimeRosteredDays: 0,
    totalRosteredDays: 0,
    completedRosteredDays: 0,
    baselineByContactType: {},
  };

  let manualDefaults = fallbackDefaults;
  let adjustmentHistory: Array<{
    id: string;
    entryDate: string | null;
    reason: string | null;
    contactTypeName: string;
    contactCount: number;
    convertedSalesCount: number;
    salesPoints: number;
  }> = [];

  if (existingSetup) {
    const [{ data: baselineRows }, { data: adjustmentRows }] = await Promise.all([
      supabase
        .from("performance_entries")
        .select("*, contact_type:contact_types(slug,points)")
        .eq("consultant_month_id", existingSetup.id)
        .eq("source", "baseline")
        .order("created_at", { ascending: true }),
      supabase
        .from("performance_entries")
        .select("id,entry_date,reason,contact_count,converted_sales_count,sales_points,contact_type:contact_types(name)")
        .eq("consultant_month_id", existingSetup.id)
        .eq("source", "manual_adjustment")
        .order("created_at", { ascending: false }),
    ]);

    const typedSetup = existingSetup as ConsultantMonthRow;
    const typedBaselineRows =
      ((baselineRows ?? []) as Array<
        PerformanceEntryRow & { contact_type: Pick<ContactTypeRow, "slug" | "points"> | null }
      >) ?? [];
    manualDefaults = rowToManualInputDefaults(typedSetup, typedBaselineRows);
    adjustmentHistory =
      ((adjustmentRows ?? []) as unknown as Array<
        Pick<
          PerformanceEntryRow,
          "id" | "entry_date" | "reason" | "contact_count" | "converted_sales_count" | "sales_points"
        > & { contact_type: Pick<ContactTypeRow, "name"> | Array<Pick<ContactTypeRow, "name">> | null }
      >).map((row) => {
        const contactType = Array.isArray(row.contact_type) ? row.contact_type[0] : row.contact_type;
        return {
        id: row.id,
        entryDate: row.entry_date,
        reason: row.reason,
        contactTypeName: contactType?.name ?? "Unknown",
        contactCount: Number(row.contact_count ?? 0),
        convertedSalesCount: Number(row.converted_sales_count ?? 0),
        salesPoints: Number(row.sales_points ?? 0),
      };
      }) ?? [];
  }

  return (
    <DashboardShell userName={profile?.full_name} activeItem="manual-input">
      <div className="mb-6">
        <h2 className="text-3xl font-semibold text-[var(--foreground)]">Manual Input</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Starting baseline and manual adjustments feed central performance calculations.
        </p>
      </div>
      <ManualInputClient
        consultantMonthId={existingSetup?.id}
        defaultValues={manualDefaults}
        adjustmentHistory={adjustmentHistory}
      />
    </DashboardShell>
  );
}
