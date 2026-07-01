import { NextResponse } from "next/server";
import { addRosteredDayOff } from "@/lib/monthlyKpi/rosteredDaysOff";
import { revalidatePerformanceViews } from "@/lib/manualInput/revalidate";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const consultantMonthId = String(formData.get("consultantMonthId") ?? "").trim();
  const offDate = String(formData.get("offDate") ?? "").trim();
  const reasonRaw = String(formData.get("reason") ?? "").trim();
  const reason = reasonRaw.length > 0 ? reasonRaw : null;

  if (!consultantMonthId || !offDate) {
    return NextResponse.json(
      { error: "Consultant month and off date are required." },
      { status: 400 }
    );
  }

  const result = await addRosteredDayOff(supabase, user.id, consultantMonthId, offDate, reason);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  }

  revalidatePerformanceViews();
  return NextResponse.json(result);
}
