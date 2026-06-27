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
    const monthlySetupId = String(formData.get("monthlySetupId") ?? "");
    const entryDate = String(formData.get("entryDate") ?? "");
    const contacts = parseNumber(formData.get("contacts") || "0", "Contacts");
    const sales = parseNumber(formData.get("sales") || "0", "Sales");
    const gwpTotal = parseNumber(formData.get("gwpTotal") || "0", "GWP total");
    const salesPoints = parseNumber(formData.get("salesPoints") || "0", "Sales points");
    const notes = String(formData.get("notes") ?? "").trim() || null;

    if (!monthlySetupId || !entryDate) {
      return { error: "Monthly setup and date are required." };
    }

    if ([contacts, sales, gwpTotal, salesPoints].some((value) => value < 0)) {
      return { error: "Values cannot be negative." };
    }

    const { data: setup, error: setupError } = await supabase
      .from("monthly_setups")
      .select("id")
      .eq("id", monthlySetupId)
      .eq("user_id", user.id)
      .single();

    if (setupError || !setup) {
      return { error: "Monthly setup not found." };
    }

    const { data: existing } = await supabase
      .from("daily_entries")
      .select("id")
      .eq("monthly_setup_id", monthlySetupId)
      .eq("entry_date", entryDate)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("daily_entries")
        .update({
          contacts,
          sales,
          gwp_total: gwpTotal,
          sales_points: salesPoints,
          notes,
        })
        .eq("id", existing.id)
        .eq("user_id", user.id);

      if (error) {
        return { error: error.message };
      }
    } else {
      const { error } = await supabase.from("daily_entries").insert({
        user_id: user.id,
        monthly_setup_id: monthlySetupId,
        entry_date: entryDate,
        contacts,
        sales,
        gwp_total: gwpTotal,
        sales_points: salesPoints,
        notes,
      });

      if (error) {
        return { error: error.message };
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

  const { error } = await supabase
    .from("daily_entries")
    .delete()
    .eq("id", entryId)
    .eq("user_id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  return { success: true };
}
