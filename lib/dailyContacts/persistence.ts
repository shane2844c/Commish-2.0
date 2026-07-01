import type { SupabaseClient } from "@supabase/supabase-js";
import { assertValidContactTypeKey } from "@/lib/contactTypes/keys";
import type { DailyContactEntryUpsert, PerformanceActionState } from "@/lib/types";
import { ensureParentUserRows, requireAuthenticatedUser } from "@/lib/supabase/ensureParentUser";
import { logSupabasePayload, logSupabaseError } from "@/lib/supabase/logPayload";

function parseNumber(value: FormDataEntryValue | null, fallback = 0): number {
  if (value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export async function persistDailyContact(
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

  const consultantMonthId = String(formData.get("consultantMonthId") ?? "");
  const entryDate = String(formData.get("entryDate") ?? "");
  const contactTypeKey = String(formData.get("contactTypeKey") ?? "");
  const contactsCount = parseNumber(formData.get("contactsCount"), 0);
  const convertedSalesCount = parseNumber(formData.get("convertedSalesCount"), 0);
  const totalGwp = parseNumber(formData.get("totalGwp"), 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const editEntryId = String(formData.get("editEntryId") ?? "").trim();

  if (!consultantMonthId || !entryDate || !contactTypeKey) {
    return { error: "Date and contact type are required.", status: 400 };
  }

  try {
    assertValidContactTypeKey(contactTypeKey);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Invalid contact type.",
      status: 400,
    };
  }

  if (contactsCount < 0 || convertedSalesCount < 0 || totalGwp < 0) {
    return { error: "Values cannot be negative.", status: 400 };
  }

  const { data: month } = await supabase
    .from("consultant_months")
    .select("id")
    .eq("id", consultantMonthId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!month) {
    return { error: "Consultant month not found.", status: 400 };
  }

  const payload: DailyContactEntryUpsert = {
    consultant_month_id: consultantMonthId,
    user_id: user.id,
    entry_date: entryDate,
    contact_type_key: contactTypeKey,
    contacts_count: contactsCount,
    converted_sales_count: convertedSalesCount,
    total_gwp: totalGwp,
    notes,
  };

  if (editEntryId) {
    const { data: existing } = await supabase
      .from("daily_contact_entries")
      .select("id")
      .eq("id", editEntryId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      return { error: "Daily contact entry not found.", status: 400 };
    }

    logSupabasePayload("daily_contact_entries", payload);

    const { error } = await supabase
      .from("daily_contact_entries")
      .update(payload)
      .eq("id", editEntryId)
      .eq("user_id", user.id);

    if (error) {
      logSupabaseError("daily_contact_entries", error);
      return { error: error.message, status: 400 };
    }

    console.log("[supabase] daily_contact_entries update success:", editEntryId);
  } else {
    logSupabasePayload("daily_contact_entries", payload);

    const { error } = await supabase.from("daily_contact_entries").insert(payload);
    if (error) {
      logSupabaseError("daily_contact_entries", error);
      return { error: error.message, status: 400 };
    }

    console.log("[supabase] daily_contact_entries insert success");
  }

  return { success: true };
}

export async function removeDailyContact(
  supabase: SupabaseClient,
  entryId: string
): Promise<PerformanceActionState & { status?: number }> {
  const authResult = await requireAuthenticatedUser(supabase);
  if (!authResult.ok) {
    return { error: authResult.error, status: authResult.status };
  }

  if (!entryId) {
    return { error: "Entry id is required.", status: 400 };
  }

  const { data: existing } = await supabase
    .from("daily_contact_entries")
    .select("id")
    .eq("id", entryId)
    .eq("user_id", authResult.user.id)
    .maybeSingle();

  if (!existing) {
    return { error: "Daily contact entry not found.", status: 400 };
  }

  logSupabasePayload("daily_contact_entries (delete)", { id: entryId });

  const { error } = await supabase
    .from("daily_contact_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", authResult.user.id);

  if (error) {
    logSupabaseError("daily_contact_entries", error);
    return { error: error.message, status: 400 };
  }

  console.log("[supabase] daily_contact_entries delete success:", entryId);
  return { success: true };
}
