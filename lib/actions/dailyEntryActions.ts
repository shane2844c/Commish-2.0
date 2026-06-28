"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DailyEntryActionState = {
  error?: string;
  success?: boolean;
};

function parseNumber(value: FormDataEntryValue | null, fieldName: string): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }
  return parsed;
}

export async function saveDailyEntry(
  _prevState: DailyEntryActionState,
  formData: FormData
): Promise<DailyEntryActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  try {
    const consultantMonthId = String(formData.get("consultantMonthId") ?? "");
    const entryDate = String(formData.get("entryDate") ?? "");
    const inboundContacts = parseNumber(formData.get("inboundContacts") || "0", "Inbound contacts");
    const outboundContacts = parseNumber(
      formData.get("outboundContacts") || "0",
      "Outbound contacts"
    );
    const transferContacts = parseNumber(
      formData.get("transferContacts") || "0",
      "Transfer contacts"
    );
    const actualSales = parseNumber(formData.get("actualSales") || "0", "Actual sales");
    const salesPoints = parseNumber(formData.get("salesPoints") || "0", "Sales points");
    const averageGwp = parseNumber(formData.get("averageGwp") || "0", "Average GWP");
    const gwpAmount = actualSales * averageGwp;
    const notes = String(formData.get("notes") ?? "").trim() || null;

    if (!consultantMonthId || !entryDate) {
      return { error: "Consultant month and date are required." };
    }

    if (
      [inboundContacts, outboundContacts, transferContacts, actualSales, averageGwp, salesPoints].some(
        (value) => value < 0
      )
    ) {
      return { error: "Values cannot be negative." };
    }

    const { data: month, error: monthError } = await supabase
      .from("consultant_months")
      .select("id")
      .eq("id", consultantMonthId)
      .eq("user_id", user.id)
      .single();

    if (monthError || !month) {
      return { error: "Month setup not found." };
    }

    const { data: existingContacts } = await supabase
      .from("daily_contact_entries")
      .select("id")
      .eq("consultant_month_id", consultantMonthId)
      .eq("entry_date", entryDate)
      .eq("source", "daily")
      .maybeSingle();

    if (existingContacts) {
      const { error: contactError } = await supabase
        .from("daily_contact_entries")
        .update({
          inbound_contacts: inboundContacts,
          outbound_contacts: outboundContacts,
          transfer_contacts: transferContacts,
        })
        .eq("id", existingContacts.id);

      if (contactError) {
        return { error: contactError.message };
      }
    } else {
      const { error: contactError } = await supabase.from("daily_contact_entries").insert({
        consultant_month_id: consultantMonthId,
        entry_date: entryDate,
        source: "daily",
        inbound_contacts: inboundContacts,
        outbound_contacts: outboundContacts,
        transfer_contacts: transferContacts,
      });

      if (contactError) {
        return { error: contactError.message };
      }
    }

    const { data: existingSales } = await supabase
      .from("sales_entries")
      .select("id")
      .eq("consultant_month_id", consultantMonthId)
      .eq("entry_date", entryDate)
      .eq("source", "daily")
      .maybeSingle();

    if (existingSales) {
      const { error: salesError } = await supabase
        .from("sales_entries")
        .update({
          actual_sales: actualSales,
          sales_points: salesPoints,
          gwp_amount: gwpAmount,
          notes,
        })
        .eq("id", existingSales.id);

      if (salesError) {
        return { error: salesError.message };
      }
    } else {
      const { error: salesError } = await supabase.from("sales_entries").insert({
        consultant_month_id: consultantMonthId,
        entry_date: entryDate,
        source: "daily",
        actual_sales: actualSales,
        sales_points: salesPoints,
        gwp_amount: gwpAmount,
        notes,
      });

      if (salesError) {
        return { error: salesError.message };
      }
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save entry." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  return { success: true };
}

export async function deleteDailyEntry(entryId: string): Promise<DailyEntryActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  const { data: salesEntry } = await supabase
    .from("sales_entries")
    .select("consultant_month_id, entry_date")
    .eq("id", entryId)
    .maybeSingle();

  const { error } = await supabase.from("sales_entries").delete().eq("id", entryId);

  if (error) {
    return { error: error.message };
  }

  if (salesEntry?.consultant_month_id && salesEntry.entry_date) {
    await supabase
      .from("daily_contact_entries")
      .delete()
      .eq("consultant_month_id", salesEntry.consultant_month_id)
      .eq("entry_date", salesEntry.entry_date)
      .eq("source", "daily");
  }

  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  return { success: true };
}
