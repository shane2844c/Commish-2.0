import Link from "next/link";
import { redirect } from "next/navigation";
import DailyEntryForm from "@/components/DailyEntryForm";
import DashboardShell from "@/components/DashboardShell";
import StatCard from "@/components/StatCard";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/calculations";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMonthYear, type ConsultantPerformanceRow } from "@/lib/types";

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

  const { data: setup } = await supabase
    .from("consultant_months")
    .select("*")
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  let entries: {
    id: string;
    entry_date: string | null;
    inbound_contacts: number;
    outbound_contacts: number;
    transfer_contacts: number;
    actual_sales: number;
    sales_points: number;
    gwp_amount: number;
    notes: string | null;
  }[] = [];
  let performance: ConsultantPerformanceRow | null = null;

  if (setup) {
    const [{ data: contactRows }, { data: salesRows }, { data: perfRow }] = await Promise.all([
      supabase
        .from("daily_contact_entries")
        .select("id,entry_date,inbound_contacts,outbound_contacts,transfer_contacts")
        .eq("consultant_month_id", setup.id)
        .eq("source", "daily")
        .order("entry_date", { ascending: false }),
      supabase
        .from("sales_entries")
        .select("id,entry_date,actual_sales,sales_points,gwp_amount,notes")
        .eq("consultant_month_id", setup.id)
        .eq("source", "daily")
        .order("entry_date", { ascending: false }),
      supabase
        .from("v_consultant_performance")
        .select("*")
        .eq("consultant_month_id", setup.id)
        .maybeSingle(),
    ]);

    const salesByDate = new Map((salesRows ?? []).map((row) => [row.entry_date, row]));
    entries = (contactRows ?? []).map((contactRow) => {
      const salesRow = salesByDate.get(contactRow.entry_date);
      return {
        id: salesRow?.id ?? contactRow.id,
        entry_date: contactRow.entry_date,
        inbound_contacts: Number(contactRow.inbound_contacts ?? 0),
        outbound_contacts: Number(contactRow.outbound_contacts ?? 0),
        transfer_contacts: Number(contactRow.transfer_contacts ?? 0),
        actual_sales: Number(salesRow?.actual_sales ?? 0),
        sales_points: Number(salesRow?.sales_points ?? 0),
        gwp_amount: Number(salesRow?.gwp_amount ?? 0),
        notes: salesRow?.notes ?? null,
      };
    });

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
            Go to Starting Data
          </Link>
        </div>
      ) : (
        <>
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

          <div className="mt-8">
            <DailyEntryForm consultantMonthId={setup.id} />
          </div>

          <div className="mt-8">
            <h3 className="mb-4 text-lg font-semibold text-[var(--foreground)]">Recent Entries</h3>
            {entries.length === 0 ? (
              <div className="rounded-xl border border-[var(--border)] bg-white p-6 text-center shadow-[0_6px_18px_rgba(0,74,147,0.08)]">
                <p className="text-sm text-[var(--muted)]">
                  No daily entries yet. Stats reflect starting values only.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-[0_6px_18px_rgba(0,74,147,0.08)]">
                <div className="h-1 bg-[var(--brand)]" />
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[var(--border)]">
                    <thead className="bg-[#f6f9ff]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                          Date
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                          Inbound
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                          Outbound
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                          Transfer
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                          Actual Sales
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                          Avg GWP
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                          Sales Points
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--brand)]">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] bg-white">
                      {entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-[#f8fbff]">
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--foreground)]">
                            {entry.entry_date}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--foreground)]">
                            {formatCurrency(Number(entry.inbound_contacts ?? 0))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--foreground)]">
                            {formatCurrency(Number(entry.outbound_contacts ?? 0))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--foreground)]">
                            {formatCurrency(Number(entry.transfer_contacts ?? 0))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--foreground)]">
                            {formatCurrency(Number(entry.actual_sales))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--foreground)]">
                            {formatCurrency(
                              Number(entry.actual_sales) > 0
                                ? Number(entry.gwp_amount) / Number(entry.actual_sales)
                                : 0
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-[var(--foreground)]">
                            {formatCurrency(Number(entry.sales_points))}
                          </td>
                          <td className="px-4 py-3 text-sm text-[var(--muted)]">
                            {entry.notes || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </DashboardShell>
  );
}
