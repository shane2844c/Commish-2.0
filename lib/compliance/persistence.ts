import type { SupabaseClient } from "@supabase/supabase-js";
import { validateComplianceScore } from "@/lib/compliance/calculate";
import { fetchComplianceMetricsForMonth } from "@/lib/compliance/queries";
import { syncConsultantMonthMetrics } from "@/lib/metrics/syncConsultantMonthMetrics";
import { upsertConsultantMonthRecord } from "@/lib/manualInput/consultantMonthUpsert";
import { calculateMonthlyKpis } from "@/lib/monthlyKpi/roster";
import { logSupabaseError } from "@/lib/supabase/logPayload";
import { ensureParentUserRows, requireAuthenticatedUser } from "@/lib/supabase/ensureParentUser";
import type { ConsultantMonthUpsert, PerformanceActionState } from "@/lib/types";
import { employmentTypeToDb } from "@/lib/types";

function parseNumber(value: FormDataEntryValue | null, fallback = 0): number {
  if (value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

async function ensureConsultantMonthForCompliance(
  supabase: SupabaseClient,
  userId: string,
  month: number,
  year: number
): Promise<{ consultantMonthId: string | null; error?: string }> {
  const { data: existing } = await supabase
    .from("consultant_months")
    .select("id")
    .eq("user_id", userId)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  if (existing?.id) {
    return { consultantMonthId: existing.id };
  }

  const { data: latestMonth } = await supabase
    .from("consultant_months")
    .select("*")
    .eq("user_id", userId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(1)
    .maybeSingle();

  const employmentType = latestMonth?.employment_type ?? "full_time";
  const fullTimePointsTarget = Number(latestMonth?.full_time_points_target ?? 0);
  const kpis = calculateMonthlyKpis({
    month,
    year,
    employmentType: employmentType === "part_time" ? "Part-time" : "Full-time",
    fullTimePointsTarget: fullTimePointsTarget || 1,
    offDates: [],
  });

  const payload: ConsultantMonthUpsert = {
    user_id: userId,
    month,
    year,
    employment_type: employmentTypeToDb(employmentType),
    full_time_points_target: fullTimePointsTarget || 1,
    full_time_rostered_days: kpis.fullTimeRosteredDays,
    base_rostered_days_this_month: kpis.baseRosteredDaysThisMonth,
    rostered_days_off: kpis.rosteredDaysOff,
    total_rostered_days_this_month: kpis.totalRosteredDaysThisMonth,
    adjusted_points_target: kpis.adjustedPointsTarget,
    completed_rostered_days_so_far: kpis.completedRosteredDaysSoFar,
  };

  const { data: monthRow, error } = await upsertConsultantMonthRecord(supabase, payload);
  if (error || !monthRow) {
    return { consultantMonthId: null, error: error?.message ?? "Failed to create consultant month." };
  }

  return { consultantMonthId: monthRow.id };
}

export async function persistComplianceScores(
  supabase: SupabaseClient,
  formData: FormData
): Promise<PerformanceActionState & { status?: number }> {
  const authResult = await requireAuthenticatedUser(supabase);
  if (!authResult.ok) {
    return { error: authResult.error, status: authResult.status };
  }

  const user = authResult.user;
  const parentResult = await ensureParentUserRows(supabase, user);
  if (!parentResult.ok) {
    return { error: parentResult.error, status: 400 };
  }

  const month = parseNumber(formData.get("month"));
  const year = parseNumber(formData.get("year"));

  if (!month || !year) {
    return { error: "Month and year are required.", status: 400 };
  }

  const { consultantMonthId, error: monthError } = await ensureConsultantMonthForCompliance(
    supabase,
    user.id,
    month,
    year
  );

  if (monthError || !consultantMonthId) {
    return { error: monthError ?? "Consultant month not found.", status: 400 };
  }

  for (let callNumber = 1; callNumber <= 5; callNumber++) {
    const scoreRaw = String(formData.get(`call_${callNumber}_score`) ?? "");
    const notesRaw = String(formData.get(`call_${callNumber}_notes`) ?? "").trim();
    const notes = notesRaw.length > 0 ? notesRaw : null;

    if (!scoreRaw.trim()) {
      const { error: deleteError } = await supabase
        .from("compliance_call_scores")
        .delete()
        .eq("consultant_month_id", consultantMonthId)
        .eq("user_id", user.id)
        .eq("call_number", callNumber);

      if (deleteError) {
        logSupabaseError("compliance_call_scores (delete empty)", deleteError);
        return { error: deleteError.message, status: 400 };
      }
      continue;
    }

    const validation = validateComplianceScore(scoreRaw);
    if (!validation.ok) {
      return { error: `Call ${callNumber}: ${validation.error}`, status: 400 };
    }

    const payload = {
      consultant_month_id: consultantMonthId,
      user_id: user.id,
      call_number: callNumber,
      score: validation.score,
      notes,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("compliance_call_scores")
      .upsert(payload, { onConflict: "consultant_month_id,call_number" });

    if (upsertError) {
      logSupabaseError("compliance_call_scores", upsertError);
      return { error: upsertError.message, status: 400 };
    }
  }

  const complianceMetrics = await fetchComplianceMetricsForMonth(
    supabase,
    user.id,
    consultantMonthId,
    month,
    year
  );

  console.log("Recalculated compliance metrics:", complianceMetrics);

  const syncResult = await syncConsultantMonthMetrics(supabase, consultantMonthId);
  if (syncResult.error) {
    return { error: syncResult.error, status: 400 };
  }

  return { success: true, message: "Compliance scores saved." };
}
