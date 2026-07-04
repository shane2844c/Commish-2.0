import Link from "next/link";
import { AppEmptyState, AppPage } from "@/components/app";
import StatCard from "@/components/StatCard";
import { applyComplianceToCommission } from "@/lib/compliance/calculate";
import { fetchComplianceMetricsForMonth } from "@/lib/compliance/queries";
import { formatCurrency, formatCurrencyPerPoint, formatNumber, formatPercent } from "@/lib/calculations";
import { APP_ROUTES } from "@/lib/app/routes";
import { requireAppUser } from "@/lib/app/session";
import { fetchConsultantPerformance } from "@/lib/performance/queries";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMonthYear, type ConsultantMonthRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
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

  const performance = setup
    ? await fetchConsultantPerformance(supabase, setup as ConsultantMonthRow)
    : null;

  const compliance = setup
    ? await fetchComplianceMetricsForMonth(supabase, user.id, setup.id, month, year)
    : null;

  const adjustedCommission =
    performance && compliance
      ? applyComplianceToCommission(
          performance.mtdCommission,
          performance.projectedCommission,
          compliance.compliancePayableRate
        )
      : null;

  const monthLabel = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <AppPage title="Dashboard" description={monthLabel}>
      {!setup ? (
        <AppEmptyState
          title="No monthly setup yet"
          message="Complete your monthly setup to start tracking performance."
          actionHref={APP_ROUTES.manualInput}
          actionLabel="Go to Manual Input"
        />
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[#f8fbff] px-4 py-3">
            <p className="text-sm text-[var(--muted)]">
              Dashboard is read-only. Update figures from Daily Contacts and Manual Input.
            </p>
            <Link
              href={APP_ROUTES.dailyContacts}
              className="rounded-lg bg-[var(--brand)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--brand-dark)]"
            >
              Daily Contacts
            </Link>
            <Link
              href={APP_ROUTES.manualInput}
              className="rounded-lg border border-[var(--brand)] px-3 py-1.5 text-xs font-medium text-[var(--brand)] hover:bg-[var(--brand-soft)]"
            >
              Manual Input
            </Link>
            <Link
              href={APP_ROUTES.compliance}
              className="rounded-lg border border-[var(--brand)] px-3 py-1.5 text-xs font-medium text-[var(--brand)] hover:bg-[var(--brand-soft)]"
            >
              Compliance
            </Link>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">MTD</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="MTD Conversion" value={formatPercent(performance?.mtdConversionRate ?? 0)} />
              <StatCard label="MTD Target Conversion" value={formatPercent(performance?.mtdTargetConversion ?? 0)} />
              <StatCard label="% To Target Conversion" value={formatPercent(performance?.percentToTargetConversion ?? 0)} />
              <StatCard label="Conversion Multiplier" value={formatNumber(performance?.mtdConversionMultiplier ?? 0, 2)} />
              <StatCard label="MTD Sales Points" value={formatNumber(performance?.mtdTotalSalesPoints ?? 0)} />
              <StatCard label="Points Target" value={formatNumber(performance?.pointsTarget ?? 0)} subtext="Adjusted for roster" />
              <StatCard label="MTD DPP" value={formatCurrencyPerPoint(performance?.mtdDpp ?? 0)} />
              <StatCard label="Average GWP" value={formatCurrency(performance?.averageGwp ?? 0)} />
              <StatCard
                label="GWP Accelerator"
                value={formatCurrencyPerPoint(performance?.gwpAcceleratorDpp ?? 0)}
              />
              <StatCard
                label="MTD Commission"
                value={formatCurrency(performance?.mtdCommission ?? 0)}
                subtext={`Before QA · Multiplier ${formatNumber(performance?.mtdConversionMultiplier ?? 0, 2)}x`}
              />
            </div>
          </div>

          {process.env.NODE_ENV === "development" && performance?.mtdConversionBreakdown && (
            <div className="mt-6 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-900">
                MTD Conversion Debug (dev only)
              </h3>
              <dl className="mt-3 grid gap-2 text-sm text-amber-950 sm:grid-cols-2">
                <div>
                  <dt className="font-medium">MTD contact denominator</dt>
                  <dd>{performance.mtdConversionBreakdown.contactDenominator}</dd>
                </div>
                <div>
                  <dt className="font-medium">MTD sales numerator</dt>
                  <dd>{performance.mtdConversionBreakdown.salesNumerator}</dd>
                </div>
                <div>
                  <dt className="font-medium">Callback contacts excluded</dt>
                  <dd>{performance.mtdConversionBreakdown.callbackEntriesExcludedFromContacts}</dd>
                </div>
                <div>
                  <dt className="font-medium">Callback sales included</dt>
                  <dd>{performance.mtdConversionBreakdown.callbackSalesIncludedInSales}</dd>
                </div>
              </dl>
            </div>
          )}

          {compliance && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
                QA Compliance
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="QA Average"
                  value={
                    compliance.qaCallsMarked > 0
                      ? formatPercent(compliance.qaAverage / 100)
                      : "Pending"
                  }
                />
                <StatCard label="QA Result" value={compliance.qaResult} />
                <StatCard
                  label="Compliance Payable Rate"
                  value={compliance.compliancePayableRateLabel}
                />
                <StatCard
                  label="Final Payable MTD Commission"
                  value={formatCurrency(adjustedCommission?.complianceAdjustedMtdCommission ?? 0)}
                  subtext="After QA compliance"
                />
              </div>
            </div>
          )}

          {(performance?.projectionDays ?? 0) > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Projection</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                label="Projected Points"
                value={formatNumber(performance?.projectedTotalSalesPoints ?? 0)}
                highlight="projected"
              />
              <StatCard
                label="Projected DPP"
                value={formatCurrencyPerPoint(performance?.projectedDpp ?? 0)}
                highlight="projected"
              />
              <StatCard
                label="Projected Commission"
                value={formatCurrency(performance?.projectedCommission ?? 0)}
                highlight="projected"
                subtext="Before QA"
              />
              {adjustedCommission && (
                <StatCard
                  label="Projected Final Commission"
                  value={formatCurrency(adjustedCommission.complianceAdjustedProjectedCommission)}
                  highlight="projected"
                  subtext="After QA compliance"
                />
              )}
            </div>
          </div>
          )}
        </>
      )}
    </AppPage>
  );
}
