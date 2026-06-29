import type { SupabaseClient } from "@supabase/supabase-js";
import { CONTACT_OUTCOME_BY_SLUG, CONTACT_TYPES } from "@/lib/config/performance";
import type { PerformanceActionState } from "@/lib/types";

function parseNumber(value: FormDataEntryValue | null, fallback = 0): number {
  if (value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export async function persistDailyContact(
  supabase: SupabaseClient,
  userId: string,
  formData: FormData
): Promise<PerformanceActionState> {
  const consultantMonthId = String(formData.get("consultantMonthId") ?? "");
  const entryDate = String(formData.get("entryDate") ?? "");
  const contactTypeSlug = String(formData.get("contactTypeSlug") ?? "");
  const outcomeSlug = String(formData.get("outcomeSlug") ?? "");
  const saleGwp = parseNumber(formData.get("saleGwp"), 0);
  const editEntryId = String(formData.get("editEntryId") ?? "").trim();

  if (!consultantMonthId || !entryDate || !contactTypeSlug || !outcomeSlug) {
    return { error: "Date, contact type, and outcome are required." };
  }

  const outcomeConfig = CONTACT_OUTCOME_BY_SLUG.get(outcomeSlug);
  const typeConfig = CONTACT_TYPES.find((item) => item.slug === contactTypeSlug);
  if (!outcomeConfig || !typeConfig) {
    return { error: "Invalid contact type or outcome." };
  }

  if (outcomeConfig.countsAsSale && saleGwp <= 0) {
    return { error: "Sale GWP is required for converted contacts." };
  }
  if (!outcomeConfig.countsAsSale && saleGwp !== 0) {
    return { error: "Sale GWP is only allowed for converted contacts." };
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

  const [{ data: contactTypeRow }, { data: outcomeRow }] = await Promise.all([
    supabase.from("contact_types").select("id").eq("slug", contactTypeSlug).maybeSingle(),
    supabase.from("contact_outcomes").select("id").eq("slug", outcomeSlug).maybeSingle(),
  ]);

  if (!contactTypeRow || !outcomeRow) {
    return { error: "Contact types/outcomes are not seeded yet. Run updated schema.sql first." };
  }

  const payload = {
    consultant_month_id: consultantMonthId,
    entry_date: entryDate,
    source: "daily" as const,
    contact_type_id: contactTypeRow.id,
    outcome_id: outcomeRow.id,
    contact_count: outcomeConfig.isExcluded ? 0 : 1,
    converted_sales_count: outcomeConfig.countsAsSale ? 1 : 0,
    sales_points: outcomeConfig.countsAsSale ? typeConfig.points : 0,
    average_gwp_input: outcomeConfig.countsAsSale ? saleGwp : null,
    hidden_total_gwp: outcomeConfig.countsAsSale ? saleGwp : 0,
    reason: null,
  };

  if (editEntryId) {
    const { data: existing } = await supabase
      .from("performance_entries")
      .select("id, consultant_month_id, consultant_months!inner(user_id)")
      .eq("id", editEntryId)
      .eq("source", "daily")
      .eq("consultant_months.user_id", userId)
      .maybeSingle();

    if (!existing) {
      return { error: "Daily contact entry not found." };
    }

    const { error } = await supabase.from("performance_entries").update(payload).eq("id", editEntryId);
    if (error) {
      return { error: error.message };
    }
  } else {
    const { error } = await supabase.from("performance_entries").insert(payload);
    if (error) {
      return { error: error.message };
    }
  }

  return { success: true };
}

export async function removeDailyContact(
  supabase: SupabaseClient,
  userId: string,
  entryId: string
): Promise<PerformanceActionState> {
  if (!entryId) {
    return { error: "Entry id is required." };
  }

  const { data: existing } = await supabase
    .from("performance_entries")
    .select("id, consultant_months!inner(user_id)")
    .eq("id", entryId)
    .eq("source", "daily")
    .eq("consultant_months.user_id", userId)
    .maybeSingle();

  if (!existing) {
    return { error: "Daily contact entry not found." };
  }

  const { error } = await supabase.from("performance_entries").delete().eq("id", entryId);
  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
