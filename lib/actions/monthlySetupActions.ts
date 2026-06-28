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
    const fullTimePointsTarget = parseNumber(
      formData.get("fullTimePointsTarget"),
      "Full-time points target"
    );
    const fullTimeRosteredDays = parseNumber(
      formData.get("fullTimeRosteredDays"),
      "Full-time rostered days"
    );
    const userRosteredDays = parseNumber(formData.get("userRosteredDays"), "User rostered days");
    const inboundTarget = parseNumber(formData.get("inboundTarget"), "Inbound target");
    const outboundTarget = parseNumber(formData.get("outboundTarget"), "Outbound target");
    const transferTarget = parseNumber(formData.get("transferTarget"), "Transfer target");

    const startingActualSales = parseNumber(
      formData.get("startingActualSales") || "0",
      "Starting actual sales"
    );
    const startingInboundContacts = parseNumber(
      formData.get("startingInboundContacts") || "0",
      "Starting inbound contacts"
    );
    const startingOutboundContacts = parseNumber(
      formData.get("startingOutboundContacts") || "0",
      "Starting outbound contacts"
    );
    const startingTransferContacts = parseNumber(
      formData.get("startingTransferContacts") || "0",
      "Starting transfer contacts"
    );
    const startingAverageGwp = parseNumber(
      formData.get("startingAverageGwp") || "0",
      "Starting average GWP"
    );
    const startingSalesPoints = parseNumber(
      formData.get("startingSalesPoints") || "0",
      "Starting sales points"
    );
    const startingGwpAmount = startingActualSales * startingAverageGwp;
    const baselineEntryDate = `${year}-${String(month).padStart(2, "0")}-01`;

    if (fullTimeRosteredDays <= 0 || userRosteredDays <= 0) {
      return { error: "Rostered days must be greater than zero." };
    }

    const numericFields = [
      fullTimeTarget,
      fullTimePointsTarget,
      inboundTarget,
      outboundTarget,
      transferTarget,
      startingActualSales,
      startingInboundContacts,
      startingOutboundContacts,
      startingTransferContacts,
      startingAverageGwp,
      startingSalesPoints,
    ];

    if (numericFields.some((value) => value < 0)) {
      return { error: "Values cannot be negative." };
    }

    const { data: monthRow, error: monthError } = await supabase
      .from("consultant_months")
      .upsert(
        {
          user_id: user.id,
          month,
          year,
          employment_type: employmentType,
          full_time_target: fullTimeTarget,
          full_time_points_target: fullTimePointsTarget,
          full_time_rostered_days: fullTimeRosteredDays,
          user_rostered_days: userRosteredDays,
          inbound_target: inboundTarget,
          outbound_target: outboundTarget,
          transfer_target: transferTarget,
        },
        { onConflict: "user_id,month,year" }
      )
      .select("id")
      .single();

    if (monthError || !monthRow) {
      return { error: monthError?.message ?? "Failed to save month setup." };
    }

    const { error: baselineContactError } = await supabase
      .from("daily_contact_entries")
      .upsert(
        {
          consultant_month_id: monthRow.id,
          source: "baseline",
          entry_date: baselineEntryDate,
          inbound_contacts: startingInboundContacts,
          outbound_contacts: startingOutboundContacts,
          transfer_contacts: startingTransferContacts,
        },
        { onConflict: "consultant_month_id,source,entry_date" }
      );

    if (baselineContactError) {
      return { error: baselineContactError.message };
    }

    const { error: baselineSalesError } = await supabase
      .from("sales_entries")
      .upsert(
        {
          consultant_month_id: monthRow.id,
          source: "baseline",
          entry_date: baselineEntryDate,
          actual_sales: startingActualSales,
          sales_points: startingSalesPoints,
          gwp_amount: startingGwpAmount,
        },
        { onConflict: "consultant_month_id,source,entry_date" }
      );

    if (baselineSalesError) {
      return { error: baselineSalesError.message };
    }

    const { error } = await supabase.from("monthly_setups").upsert(
      {
        user_id: user.id,
        month,
        year,
        employment_type: employmentType,
        full_time_target: fullTimeTarget,
        full_time_points_target: fullTimePointsTarget,
        full_time_rostered_days: fullTimeRosteredDays,
        user_rostered_days: userRosteredDays,
        gwp_target: 0,
        conversion_target: 0,
        inbound_target: inboundTarget,
        outbound_target: outboundTarget,
        transfer_target: transferTarget,
        starting_sales: startingActualSales,
        starting_contacts:
          startingInboundContacts + startingOutboundContacts + startingTransferContacts,
        starting_inbound_contacts: startingInboundContacts,
        starting_outbound_contacts: startingOutboundContacts,
        starting_transfer_contacts: startingTransferContacts,
        starting_gwp_total: startingGwpAmount,
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
