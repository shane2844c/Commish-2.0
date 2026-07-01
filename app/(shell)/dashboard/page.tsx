import Link from "next/link";
import { redirect } from "next/navigation";
import StatCard from "@/components/StatCard";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/calculations";
import { fetchConsultantPerformance } from "@/lib/performance/queries";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMonthYear, type ConsultantMonthRow } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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

  const monthLabel = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-[var(--foreground)]">Dashboard</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{monthLabel}</p>
      </div>

      {!setup ? (
        <div className="rounded-xl border border-[var(--border)] bg-white p-8 text-center shadow-[0_6px_18px_rgba(0,74,147,0.08)]">
          <h3 className="text-lg font-medium text-[var(--foreground)]">No monthly setup yet</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Complete your monthly setup to start tracking performance.
          </p>
          <Link
            href="/setup"
            className="mt-6 inline-block rounded-lg bg-[var(--brand)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)]"
          >
            Go to Manual Input
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[#f8fbff] px-4 py-3">
            <p className="text-sm text-[var(--muted)]">
              Dashboard is read-only. Update figures from Daily Contacts and Manual Input.
            </p>
            <Link
              href="/daily-contacts"
              className="rounded-lg bg-[var(--brand)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--brand-dark)]"
            >
              Daily Contacts
            </Link>
            <Link
              href="/setup"
              className="rounded-lg border border-[var(--brand)] px-3 py-1.5 text-xs font-medium text-[var(--brand)] hover:bg-[var(--brand-soft)]"
            >
              Manual Input
            </Link>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">MTD</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="MTD Conversion" value={formatPercent(performance?.mtdConversionRate ?? 0)} />
              <StatCard label="MTD Target Conversion" value={formatPercent(performance?.mtdTargetConversion ?? 0)} />
              <StatCard label="% To Target Conversion" value={formatPercent(performance?.percentToTargetConversion ?? 0)} />
              <StatCard label="Conversion Multiplier" value={formatNumber(performance?.mtdConversionMultiplier ?? 0, 2)} />
              <StatCard label="MTD Sales Points" value={formatCurrency(performance?.mtdTotalSalesPoints ?? 0)} />
              <StatCard label="Points Target" value={formatCurrency(performance?.pointsTarget ?? 0)} subtext="Adjusted for roster" />
              <StatCard label="MTD DPP" value={formatCurrency(performance?.mtdDpp ?? 0)} />
              <StatCard label="Average GWP" value={formatCurrency(performance?.averageGwp ?? 0)} />
              <StatCard
                label="GWP Accelerator"
                value={formatCurrency(performance?.gwpAcceleratorDpp ?? 0)}
              />
              <StatCard
                label="MTD Commission"
                value={formatCurrency(performance?.mtdCommission ?? 0)}
                subtext={`Multiplier ${formatNumber(performance?.mtdConversionMultiplier ?? 0, 2)}x`}
              />
            </div>
          </div>

          {(performance?.projectionDays ?? 0) > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Projection</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                label="Projected Points"
                value={formatCurrency(performance?.projectedTotalSalesPoints ?? 0)}
                highlight="projected"
              />
              <StatCard
                label="Projected DPP"
                value={formatCurrency(performance?.projectedDpp ?? 0)}
                highlight="projected"
              />
              <StatCard
                label="Projected Commission"
                value={formatCurrency(performance?.projectedCommission ?? 0)}
                highlight="projected"
              />
            </div>
          </div>
          )}
        </>
      )}
    </>
  );
}
