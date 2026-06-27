import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import MonthlySetupForm from "@/components/MonthlySetupForm";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMonthYear } from "@/lib/types";

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
    .from("monthly_setups")
    .select("*")
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  return (
    <DashboardShell userName={profile?.full_name}>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Monthly Setup</h2>
        <p className="mt-1 text-sm text-gray-500">
          Configure your targets and starting statistics for the month.
        </p>
      </div>
      <MonthlySetupForm
        defaultValues={
          existingSetup
            ? {
                month: existingSetup.month,
                year: existingSetup.year,
                employmentType: existingSetup.employment_type,
                fullTimeTarget: Number(existingSetup.full_time_target),
                fullTimeRosteredDays: Number(existingSetup.full_time_rostered_days),
                userRosteredDays: Number(existingSetup.user_rostered_days),
                gwpTarget: Number(existingSetup.gwp_target),
                conversionTarget: Number(existingSetup.conversion_target),
                startingSales: Number(existingSetup.starting_sales),
                startingContacts: Number(existingSetup.starting_contacts),
                startingGwpTotal: Number(existingSetup.starting_gwp_total),
                startingSalesPoints: Number(existingSetup.starting_sales_points),
              }
            : undefined
        }
      />
    </DashboardShell>
  );
}
