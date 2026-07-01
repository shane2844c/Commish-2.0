import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import ManualInputClient from "@/components/ManualInputClient";
import {
  contactTypeDisplayName,
  contactTypePointsPerSale,
  mapContactTypeRows,
} from "@/lib/contactTypes/helpers";
import { fetchContactTypes } from "@/lib/performance/queries";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentMonthYear,
  rowToManualInputDefaults,
  type AdjustmentHistoryRow,
  type ConsultantMonthRow,
  type ManualContactAdjustmentRow,
  type ManualInputDefaultValues,
  type MonthlyContactBaselineRow,
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

  const contactTypes = mapContactTypeRows(await fetchContactTypes(supabase));
  const { month, year } = getCurrentMonthYear();

  const { data: existingSetup } = await supabase
    .from("consultant_months")
    .select("*")
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  const fallbackDefaults: ManualInputDefaultValues = {
    month,
    year,
    employmentType: "Full-time",
    fullTimePointsTarget: 0,
    fullTimeRosteredDays: 0,
    totalRosteredDaysThisMonth: 0,
    completedRosteredDaysSoFar: 0,
    baselineByContactType: {},
  };

  let manualDefaults = fallbackDefaults;
  let adjustmentHistory: AdjustmentHistoryRow[] = [];

  if (existingSetup) {
    const [{ data: baselineRows }, { data: adjustmentRows }] = await Promise.all([
      supabase
        .from("monthly_contact_baselines")
        .select("*")
        .eq("consultant_month_id", existingSetup.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("manual_contact_adjustments")
        .select("*")
        .eq("consultant_month_id", existingSetup.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    manualDefaults = rowToManualInputDefaults(
      existingSetup as ConsultantMonthRow,
      (baselineRows ?? []) as MonthlyContactBaselineRow[]
    );

    adjustmentHistory = ((adjustmentRows ?? []) as ManualContactAdjustmentRow[]).map((row) => ({
      id: row.id,
      adjustmentDate: row.adjustment_date,
      reason: row.reason,
      contactTypeName: contactTypeDisplayName(contactTypes, row.contact_type_key),
      contactsDelta: Number(row.contacts_delta),
      convertedSalesDelta: Number(row.converted_sales_delta),
      salesPointsDelta:
        Number(row.converted_sales_delta) * contactTypePointsPerSale(contactTypes, row.contact_type_key),
    }));
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
        contactTypes={contactTypes}
      />
    </DashboardShell>
  );
}
