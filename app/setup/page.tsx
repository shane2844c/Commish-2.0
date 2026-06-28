import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import MonthlySetupForm from "@/components/MonthlySetupForm";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMonthYear, rowToStartingDataInput } from "@/lib/types";

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

  const { data: existingSetup } = await supabase
    .from("consultant_months")
    .select("*")
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  let baselineContacts = null;
  let baselineSales = null;

  if (existingSetup) {
    const [{ data: contactRow }, { data: salesRow }] = await Promise.all([
      supabase
        .from("daily_contact_entries")
        .select("*")
        .eq("consultant_month_id", existingSetup.id)
        .eq("source", "baseline")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("sales_entries")
        .select("*")
        .eq("consultant_month_id", existingSetup.id)
        .eq("source", "baseline")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    baselineContacts = contactRow;
    baselineSales = salesRow;
  }

  return (
    <DashboardShell userName={profile?.full_name} activeItem="starting-data">
      <div className="mb-6">
        <h2 className="text-3xl font-semibold text-[var(--foreground)]">Starting Data</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">Set baseline values for this month.</p>
      </div>
      <MonthlySetupForm
        defaultValues={
          existingSetup
            ? rowToStartingDataInput(existingSetup, baselineContacts, baselineSales)
            : undefined
        }
      />
    </DashboardShell>
  );
}
