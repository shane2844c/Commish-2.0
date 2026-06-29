import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import StatCard from "@/components/StatCard";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/calculations";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMonthYear, toMonthStart, type ConsultantPerformanceRow } from "@/lib/types";

export default async function DashboardPage() {
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

  const { data: setup } = await supabase
    .from("consultant_months")
    .select("*")
    .eq("user_id", user.id)
    .eq("month_start", monthStart)
    .maybeSingle();

  let performance: ConsultantPerformanceRow | null = null;

  if (setup) {
    const { data: perfRow } = await supabase
      .from("v_consultant_performance")
      .select("*")
      .eq("consultant_month_id", setup.id)
      .maybeSingle();
    performance = perfRow;
  }

  const monthLabel = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <DashboardShell userName={profile?.full_name} activeItem="dashboard">
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
              <StatCard label="MTD Conversion" value={formatPercent(performance?.mtd_conversion_rate ?? 0)} />
              <StatCard
                label="MTD Target Conversion"
                value={formatPercent(performance?.mtd_target_conversion ?? 0)}
              />
              <StatCard
                label="% To Target Conversion"
                value={formatPercent(performance?.percent_to_target_conversion ?? 0)}
              />
              <StatCard
                label="Conversion Multiplier"
                value={formatNumber(performance?.mtd_conversion_multiplier ?? 0, 2)}
              />
              <StatCard
                label="MTD Sales Points"
                value={formatCurrency(performance?.mtd_total_sales_points ?? 0)}
              />
              <StatCard label="Points Target" value={formatCurrency(performance?.points_target ?? 0)} />
              <StatCard label="MTD DPP" value={formatCurrency(performance?.mtd_dpp ?? 0)} />
              <StatCard label="Average GWP" value={formatCurrency(performance?.average_gwp ?? 0)} />
              <StatCard label="GWP/Point" value={formatCurrency(performance?.gwp_payable_per_point ?? 0)} />
              <StatCard
                label="MTD Commission"
                value={formatCurrency(performance?.mtd_commission ?? 0)}
                subtext={`Multiplier ${formatNumber(performance?.mtd_conversion_multiplier ?? 0, 2)}x`}
              />
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Projection
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                label="Projected Points"
                value={formatCurrency(performance?.projected_total_sales_points ?? 0)}
                highlight="projected"
              />
              <StatCard
                label="Projected DPP"
                value={formatCurrency(performance?.projected_dpp ?? 0)}
                highlight="projected"
              />
              <StatCard
                label="Projected Commission"
                value={formatCurrency(performance?.projected_commission ?? 0)}
                highlight="projected"
              />
            </div>
          </div>
        </>
      )}
    </DashboardShell>
  );
}
