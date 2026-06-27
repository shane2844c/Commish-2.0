"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EmploymentType } from "@/lib/types";

export type MonthlySetupActionState = {
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

export async function saveMonthlySetup(
  _prevState: MonthlySetupActionState,
  formData: FormData
): Promise<MonthlySetupActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be logged in." };
  }

  try {
    const month = parseNumber(formData.get("month"), "Month");
    const year = parseNumber(formData.get("year"), "Year");
    const employmentType = String(formData.get("employmentType")) as EmploymentType;

    if (employmentType !== "full-time" && employmentType !== "part-time") {
      return { error: "Invalid employment type." };
    }

    const fullTimeTarget = parseNumber(formData.get("fullTimeTarget"), "Full-time target");
    const fullTimeRosteredDays = parseNumber(
      formData.get("fullTimeRosteredDays"),
      "Full-time rostered days"
    );
    const userRosteredDays = parseNumber(formData.get("userRosteredDays"), "User rostered days");
    const gwpTarget = parseNumber(formData.get("gwpTarget"), "GWP target");
    const conversionTarget = parseNumber(formData.get("conversionTarget") || "0", "Conversion target");

    const startingSales = parseNumber(formData.get("startingSales") || "0", "Starting sales");
    const startingContacts = parseNumber(
      formData.get("startingContacts") || "0",
      "Starting contacts"
    );
    const startingGwpTotal = parseNumber(
      formData.get("startingGwpTotal") || "0",
      "Starting GWP total"
    );
    const startingSalesPoints = parseNumber(
      formData.get("startingSalesPoints") || "0",
      "Starting sales points"
    );

    if (fullTimeRosteredDays <= 0 || userRosteredDays <= 0) {
      return { error: "Rostered days must be greater than zero." };
    }

    const numericFields = [
      fullTimeTarget,
      gwpTarget,
      conversionTarget,
      startingSales,
      startingContacts,
      startingGwpTotal,
      startingSalesPoints,
    ];

    if (numericFields.some((value) => value < 0)) {
      return { error: "Values cannot be negative." };
    }

    const { error } = await supabase.from("monthly_setups").upsert(
      {
        user_id: user.id,
        month,
        year,
        employment_type: employmentType,
        full_time_target: fullTimeTarget,
        full_time_rostered_days: fullTimeRosteredDays,
        user_rostered_days: userRosteredDays,
        gwp_target: gwpTarget,
        conversion_target: conversionTarget,
        starting_sales: startingSales,
        starting_contacts: startingContacts,
        starting_gwp_total: startingGwpTotal,
        starting_sales_points: startingSalesPoints,
      },
      { onConflict: "user_id,month,year" }
    );

    if (error) {
      return { error: error.message };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to save setup." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  redirect("/dashboard");
}
