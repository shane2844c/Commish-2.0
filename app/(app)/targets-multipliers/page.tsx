import { AppEmptyState, AppPage } from "@/components/app";
import TargetsMultipliersView from "@/components/TargetsMultipliersView";
import { APP_ROUTES } from "@/lib/app/routes";
import { requireAppUser } from "@/lib/app/session";
import { calculateMonthlyKpis } from "@/lib/monthlyKpi/roster";
import { fetchRosteredDaysOff } from "@/lib/monthlyKpi/rosteredDaysOff";
import { fetchConsultantPerformance } from "@/lib/performance/queries";
import { createClient } from "@/lib/supabase/server";
import { employmentTypeFromDb, getCurrentMonthYear, type ConsultantMonthRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TargetsMultipliersPage() {
  const supabase = await createClient();
  const user = await requireAppUser(supabase);

  const { month, year } = getCurrentMonthYear();

  const { data: setup } = await supabase
    .from("consultant_months")
    .select("*")
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  const monthLabel = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  if (!setup) {
    return (
      <AppPage title="Targets & Multipliers" description={monthLabel}>
        <AppEmptyState
          title="No monthly setup yet"
          message="Complete your monthly setup to view tier targets and accelerators."
          actionHref={APP_ROUTES.manualInput}
          actionLabel="Go to Manual Input"
        />
      </AppPage>
    );
  }

  const monthRow = setup as ConsultantMonthRow;
  const offDates = await fetchRosteredDaysOff(supabase, monthRow.id);
  const performance = await fetchConsultantPerformance(supabase, monthRow);

  const monthKpis = calculateMonthlyKpis({
    month: Number(monthRow.month),
    year: Number(monthRow.year),
    employmentType: employmentTypeFromDb(monthRow.employment_type),
    fullTimePointsTarget: Number(monthRow.full_time_points_target),
    offDates,
  });

  return (
    <AppPage
      title="Targets & Multipliers"
      description="See your sales points ladder, conversion accelerator, and GWP bonus tiers."
    >
      <TargetsMultipliersView
        monthLabel={monthLabel}
        currentSalesPoints={performance.mtdTotalSalesPoints}
        percentToTargetConversion={performance.percentToTargetConversion}
        averageGwp={performance.averageGwp}
        totalRosteredDaysThisMonth={monthKpis.totalRosteredDaysThisMonth}
        fullTimeRosteredDays={monthKpis.fullTimeRosteredDays}
      />
    </AppPage>
  );
}
