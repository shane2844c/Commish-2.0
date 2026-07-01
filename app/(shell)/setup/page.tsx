import ManualInputClient from "@/components/ManualInputClient";
import {
  contactTypeDisplayName,
  contactTypePointsPerSale,
  mapContactTypeRows,
} from "@/lib/contactTypes/helpers";
import { calculateMonthlyKpis } from "@/lib/monthlyKpi/roster";
import { mapRosteredDayOffRows } from "@/lib/monthlyKpi/rosteredDaysOff";
import { fetchContactTypes } from "@/lib/performance/queries";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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

  const contactTypes = mapContactTypeRows(await fetchContactTypes(supabase));
  const { month, year } = getCurrentMonthYear();

  const defaultKpis = calculateMonthlyKpis({
    month,
    year,
    employmentType: "Full-time",
    fullTimePointsTarget: 0,
    offDates: [],
  });

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
    rosteredDaysOffEntries: [],
    fullTimeRosteredDays: defaultKpis.fullTimeRosteredDays,
    baseRosteredDaysThisMonth: defaultKpis.baseRosteredDaysThisMonth,
    totalRosteredDaysThisMonth: defaultKpis.totalRosteredDaysThisMonth,
    adjustedPointsTarget: defaultKpis.adjustedPointsTarget,
    completedRosteredDaysSoFar: defaultKpis.completedRosteredDaysSoFar,
    baselineByContactType: {},
  };

  let manualDefaults = fallbackDefaults;
  let adjustmentHistory: AdjustmentHistoryRow[] = [];

  if (existingSetup) {
    const [{ data: baselineRows }, { data: adjustmentRows }, { data: rosteredOffRows }] =
      await Promise.all([
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
      supabase
        .from("consultant_rostered_days_off")
        .select("*")
        .eq("consultant_month_id", existingSetup.id)
        .eq("user_id", user.id)
        .order("off_date", { ascending: true }),
    ]);

    const rosteredDaysOffEntries = mapRosteredDayOffRows(rosteredOffRows ?? []);

    manualDefaults = rowToManualInputDefaults(
      existingSetup as ConsultantMonthRow,
      (baselineRows ?? []) as MonthlyContactBaselineRow[],
      rosteredDaysOffEntries
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
    <>
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
    </>
  );
}
