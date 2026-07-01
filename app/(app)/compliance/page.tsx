import { AppPage } from "@/components/app";
import ComplianceManager from "@/components/ComplianceManager";
import { fetchComplianceCallScores, fetchComplianceMetricsForMonth } from "@/lib/compliance/queries";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMonthYear } from "@/lib/types";

type CompliancePageProps = {
  searchParams: Promise<{ month?: string; year?: string }>;
};

export default async function CompliancePage({ searchParams }: CompliancePageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthenticated");
  }

  const params = await searchParams;
  const { month: currentMonth, year: currentYear } = getCurrentMonthYear();
  const month = Number(params.month || currentMonth);
  const year = Number(params.year || currentYear);

  const { data: consultantMonth } = await supabase
    .from("consultant_months")
    .select("id")
    .eq("user_id", user.id)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  const consultantMonthId = consultantMonth?.id;
  const scoreRows = consultantMonthId
    ? await fetchComplianceCallScores(supabase, consultantMonthId)
    : [];

  const initialCalls = scoreRows.map((row) => ({
    callNumber: Number(row.call_number),
    score: String(row.score),
    notes: row.notes ?? "",
  }));

  const summary = await fetchComplianceMetricsForMonth(
    supabase,
    user.id,
    consultantMonthId,
    month,
    year
  );

  return (
    <AppPage
      title="Compliance"
      description="Record QA call scores and track commission payable rates after compliance review."
    >
      <ComplianceManager
        month={month}
        year={year}
        consultantMonthId={consultantMonthId}
        initialCalls={initialCalls}
        summary={summary}
      />
    </AppPage>
  );
}
