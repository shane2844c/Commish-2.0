import Link from "next/link";
import { redirect } from "next/navigation";
import DailyEntryForm from "@/components/DailyEntryForm";
import DashboardShell from "@/components/DashboardShell";
import StatCard from "@/components/StatCard";
import {
  calculateDashboardStats,
  formatCurrency,
  formatPercent,
} from "@/lib/calculations";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentMonthYear,
  rowToDailyEntry,
  rowToMonthlySetup,
  type DailyEntryRow,
} from "@/lib/types";

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
    .from("monthly_setups")
    .select("*")
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  let entries: DailyEntryRow[] = [];

  if (setup) {
    const { data: dailyEntries } = await supabase
      .from("daily_entries")
      .select("*")
      .eq("monthly_setup_id", setup.id)
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false });

    entries = dailyEntries ?? [];
  }

  const stats = setup
    ? calculateDashboardStats(
        rowToMonthlySetup(setup),
        entries.map(rowToDailyEntry)
      )
    : null;

  const monthLabel = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <DashboardShell userName={profile?.full_name}>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">{monthLabel}</p>
      </div>

      {!setup ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-sm">
          <h3 className="text-lg font-medium text-gray-900">No monthly setup yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Complete your monthly setup to start tracking performance.
          </p>
          <Link
            href="/setup"
            className="mt-6 inline-block rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Go to Setup
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="MTD Sales" value={formatCurrency(stats!.mtdSales)} />
            <StatCard
              label="Adjusted Target"
              value={formatCurrency(stats!.adjustedTarget)}
            />
            <StatCard
              label="% To Target"
              value={formatPercent(stats!.percentageToTarget)}
            />
            <StatCard
              label="Sales Needed"
              value={formatCurrency(stats!.salesNeeded)}
            />
            <StatCard
              label="Sales Needed Per Remaining Day"
              value={formatCurrency(stats!.salesNeededPerRemainingDay)}
              subtext={`${stats!.remainingRosteredDays} rostered days remaining`}
            />
            <StatCard label="MTD Contacts" value={formatCurrency(stats!.mtdContacts)} />
            <StatCard label="Average GWP" value={formatCurrency(stats!.averageGwp)} />
            <StatCard
              label="GWP Target"
              value={formatCurrency(Number(setup.gwp_target))}
            />
          </div>

          <div className="mt-8">
            <DailyEntryForm monthlySetupId={setup.id} />
          </div>

          <div className="mt-8">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">Recent Entries</h3>
            {entries.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
                <p className="text-sm text-gray-500">
                  No daily entries yet. Stats reflect starting values only.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Date
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                          Contacts
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                          Sales
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                          GWP Total
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                          Sales Points
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                            {entry.entry_date}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                            {formatCurrency(Number(entry.contacts))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                            {formatCurrency(Number(entry.sales))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                            {formatCurrency(Number(entry.gwp_total))}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm text-gray-700">
                            {formatCurrency(Number(entry.sales_points))}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
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
