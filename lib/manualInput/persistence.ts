import type { SupabaseClient } from "@supabase/supabase-js";
import type { PerformanceActionState } from "@/lib/types";
import { employmentTypeToDb, toMonthStart } from "@/lib/types";

function parseNumber(value: FormDataEntryValue | null, fallback = 0): number {
  if (value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export async function persistManualBaseline(
  supabase: SupabaseClient,
  userId: string,
  formData: FormData
): Promise<PerformanceActionState> {
  const month = parseNumber(formData.get("month"));
  const year = parseNumber(formData.get("year"));
  const employmentTypeForDb = employmentTypeToDb(String(formData.get("employmentType") ?? "Full-time"));
  const fullTimePointsTarget = parseNumber(formData.get("fullTimePointsTarget"));
  const fullTimeRosteredDays = parseNumber(formData.get("fullTimeRosteredDays"));
  const totalRosteredDays = parseNumber(formData.get("totalRosteredDays"));
  const completedRosteredDays = parseNumber(formData.get("completedRosteredDays"));

  if (!month || !year || !fullTimePointsTarget || !fullTimeRosteredDays || !totalRosteredDays) {
    return { error: "Month setup fields are required." };
  }

  const monthStart = toMonthStart(month, year);

  const { data: existingMonth } = await supabase
    .from("consultant_months")
    .select("id, join_date")
    .eq("user_id", userId)
    .eq("month_start", monthStart)
    .maybeSingle();

  const { data: monthRow, error: monthError } = await supabase
    .from("consultant_months")
    .upsert(
      {
        user_id: userId,
        month_start: monthStart,
        employment_type: employmentTypeForDb,
        full_time_points_target: fullTimePointsTarget,
        full_time_rostered_days: fullTimeRosteredDays,
        user_rostered_days: totalRosteredDays,
        completed_rostered_days: completedRosteredDays,
        join_date: existingMonth?.join_date ?? monthStart,
        baseline_completed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,month_start" }
    )
    .select("id")
    .single();

  if (monthError || !monthRow) {
    return { error: monthError?.message ?? "Failed to save consultant month." };
  }

  const { data: contactTypes } = await supabase.from("contact_types").select("id,slug,points");
  if (!contactTypes || contactTypes.length === 0) {
    return { error: "Contact types are missing. Run updated schema.sql first." };
  }

  const entryDate = monthStart;

  for (const type of contactTypes) {
    const contacts = parseNumber(formData.get(`${type.slug}__contacts`));
    const convertedSales = parseNumber(formData.get(`${type.slug}__convertedSales`));
    const averageGwp = parseNumber(formData.get(`${type.slug}__averageGwp`));
    const salesPoints = convertedSales * Number(type.points);
    const hiddenTotalGwp = convertedSales * averageGwp;

    const { data: existing } = await supabase
      .from("performance_entries")
      .select("id")
      .eq("consultant_month_id", monthRow.id)
      .eq("source", "baseline")
      .eq("contact_type_id", type.id)
      .maybeSingle();

    const payload = {
      consultant_month_id: monthRow.id,
      entry_date: entryDate,
      source: "baseline" as const,
      contact_type_id: type.id,
      outcome_id: null,
      contact_count: contacts,
      converted_sales_count: convertedSales,
      sales_points: salesPoints,
      average_gwp_input: averageGwp,
      hidden_total_gwp: hiddenTotalGwp,
      reason: null,
    };

    if (existing) {
      const { error } = await supabase.from("performance_entries").update(payload).eq("id", existing.id);
      if (error) {
        return { error: error.message };
      }
    } else {
      const { error } = await supabase.from("performance_entries").insert(payload);
      if (error) {
        return { error: error.message };
      }
    }
  }

  return { success: true, message: "Baseline saved." };
}

export async function persistManualAdjustment(
  supabase: SupabaseClient,
  userId: string,
  formData: FormData
): Promise<PerformanceActionState> {
  const consultantMonthId = String(formData.get("consultantMonthId") ?? "");
  const entryDate = String(formData.get("adjustmentDate") ?? "");
  const reason = String(formData.get("adjustmentReason") ?? "").trim();

  if (!consultantMonthId || !entryDate || !reason) {
    return { error: "Date and reason are required for manual adjustments." };
  }

  const { data: month } = await supabase
    .from("consultant_months")
    .select("id")
    .eq("id", consultantMonthId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!month) {
    return { error: "Consultant month not found." };
  }

  const { data: contactTypes } = await supabase.from("contact_types").select("id,slug,points");
  if (!contactTypes || contactTypes.length === 0) {
    return { error: "Contact types are missing. Run updated schema.sql first." };
  }

  const entries = contactTypes
    .map((type) => {
      const contacts = parseNumber(formData.get(`${type.slug}__contacts`));
      const convertedSales = parseNumber(formData.get(`${type.slug}__convertedSales`));
      const averageGwp = parseNumber(formData.get(`${type.slug}__averageGwp`));
      if (contacts === 0 && convertedSales === 0 && averageGwp === 0) {
        return null;
      }

      return {
        consultant_month_id: consultantMonthId,
        entry_date: entryDate,
        source: "manual_adjustment" as const,
        contact_type_id: type.id,
        outcome_id: null,
        contact_count: contacts,
        converted_sales_count: convertedSales,
        sales_points: convertedSales * Number(type.points),
        average_gwp_input: averageGwp,
        hidden_total_gwp: convertedSales * averageGwp,
        reason,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (entries.length === 0) {
    return { error: "Enter at least one non-zero adjustment row." };
  }

  const { error } = await supabase.from("performance_entries").insert(entries);
  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "Manual adjustment saved." };
}
