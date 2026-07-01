import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConsultantMonthUpsert } from "@/lib/types";
import { logSupabaseError } from "@/lib/supabase/logPayload";
import { isMissingSchemaError } from "@/lib/supabase/schemaErrors";

type LegacyConsultantMonthUpsert = {
  user_id: string;
  month: number;
  year: number;
  employment_type: ConsultantMonthUpsert["employment_type"];
  full_time_points_target: number;
  full_time_rostered_days: number;
  total_rostered_days_this_month: number;
  completed_rostered_days_so_far: number;
};

function toLegacyConsultantMonthPayload(
  payload: ConsultantMonthUpsert
): LegacyConsultantMonthUpsert {
  return {
    user_id: payload.user_id,
    month: payload.month,
    year: payload.year,
    employment_type: payload.employment_type,
    full_time_points_target: payload.full_time_points_target,
    full_time_rostered_days: payload.full_time_rostered_days,
    total_rostered_days_this_month: payload.total_rostered_days_this_month,
    completed_rostered_days_so_far: payload.completed_rostered_days_so_far,
  };
}

export async function upsertConsultantMonthRecord(
  supabase: SupabaseClient,
  payload: ConsultantMonthUpsert
): Promise<{ data: { id: string } | null; error: { message: string } | null }> {
  const fullResult = await supabase
    .from("consultant_months")
    .upsert(payload, { onConflict: "user_id,month,year" })
    .select("id")
    .single();

  if (!fullResult.error) {
    return fullResult;
  }

  if (!isMissingSchemaError(fullResult.error)) {
    logSupabaseError("consultant_months", fullResult.error);
    return fullResult;
  }

  console.warn(
    "consultant_months KPI columns missing in Supabase — saving legacy payload. Run supabase/migrations/add_consultant_month_kpi_columns.sql"
  );

  const legacyResult = await supabase
    .from("consultant_months")
    .upsert(toLegacyConsultantMonthPayload(payload), { onConflict: "user_id,month,year" })
    .select("id")
    .single();

  if (legacyResult.error) {
    logSupabaseError("consultant_months (legacy payload)", legacyResult.error);
  }

  return legacyResult;
}
