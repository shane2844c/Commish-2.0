import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateCounts } from "@/lib/dailyContacts/counts";
import { assertValidContactTypeKey } from "@/lib/contactTypes/keys";
import type { DailyContactEntryInsert, PerformanceActionState } from "@/lib/types";
import { ensureParentUserRows, requireAuthenticatedUser } from "@/lib/supabase/ensureParentUser";
import { logSupabasePayload, logSupabaseError } from "@/lib/supabase/logPayload";
import { syncConsultantMonthMetrics } from "@/lib/metrics/syncConsultantMonthMetrics";

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
  const dispositionKey = String(formData.get("dispositionKey") ?? "").trim();
  const totalGwpInput = parseNumber(formData.get("totalGwp"), 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const editEntryId = String(formData.get("editEntryId") ?? "").trim();

  if (!consultantMonthId || !entryDate || !contactTypeKey || !dispositionKey) {
    return { error: "Date, contact type, and disposition are required.", status: 400 };
  }

  try {
    assertValidContactTypeKey(contactTypeKey);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Invalid contact type.",
      status: 400,
    };
  }

  const { data: dispositionRow } = await supabase
    .from("contact_dispositions")
    .select("disposition_key")
    .eq("disposition_key", dispositionKey)
    .maybeSingle();

  if (!dispositionRow) {
    return { error: `Invalid disposition_key: "${dispositionKey}"`, status: 400 };
  }

  if (dispositionKey === "converted_to_sale" && totalGwpInput < 0) {
    return { error: "Total GWP cannot be negative.", status: 400 };
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

  const { contacts_count, converted_sales_count } = calculateCounts(contactTypeKey, dispositionKey);

  const payload: DailyContactEntryInsert = {
    consultant_month_id: consultantMonthId,
    user_id: user.id,
    entry_date: entryDate,
    contact_type_key: contactTypeKey,
    disposition_key: dispositionKey,
    contacts_count,
    converted_sales_count,
    total_gwp: dispositionKey === "converted_to_sale" ? Number(totalGwpInput || 0) : 0,
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

    logSupabasePayload("daily_contact_entries (update by id)", payload);

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
    console.log("Inserting new daily contact entry:", payload);
    logSupabasePayload("daily_contact_entries", payload);

    const { error } = await supabase.from("daily_contact_entries").insert(payload);
    if (error) {
      logSupabaseError("daily_contact_entries", error);
      if (error.message.includes("daily_contact_entries_month_date_type_unique")) {
        return {
          error:
            "Database still has an old unique constraint on date + contact type. Run supabase/migrations/drop_daily_contact_entries_unique.sql in Supabase SQL Editor.",
          status: 400,
        };
      }
      return { error: error.message, status: 400 };
    }

    console.log("[supabase] daily_contact_entries insert success");
  }

  const syncResult = await syncConsultantMonthMetrics(supabase, consultantMonthId);
  if (syncResult.error) {
    console.warn("[daily-contacts] metrics sync failed after save:", syncResult.error);
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
    .select("id, consultant_month_id")
    .eq("id", entryId)
    .eq("user_id", authResult.user.id)
    .maybeSingle();

  if (!existing) {
    return { error: "Daily contact entry not found.", status: 400 };
  }

  const consultantMonthId = existing.consultant_month_id as string;

  logSupabasePayload("daily_contact_entries (delete)", { id: entryId });

  const { data: deletedRows, error } = await supabase
    .from("daily_contact_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", authResult.user.id)
    .select("id");

  if (error) {
    logSupabaseError("daily_contact_entries", error);
    return { error: error.message, status: 400 };
  }

  if (!deletedRows?.length) {
    return {
      error: "Could not delete contact entry. It may have already been removed.",
      status: 404,
    };
  }

  console.log("[supabase] daily_contact_entries delete success:", entryId);

  const syncResult = await syncConsultantMonthMetrics(supabase, consultantMonthId);
  if (syncResult.error) {
    console.warn("[daily-contacts] metrics sync failed after delete:", syncResult.error);
  }

  return { success: true };
}
