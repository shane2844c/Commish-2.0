import { NextResponse } from "next/server";
import { removeRosteredDayOff } from "@/lib/monthlyKpi/rosteredDaysOff";
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
  const entryId = String(formData.get("entryId") ?? "").trim();

  if (!entryId) {
    return NextResponse.json({ error: "Entry id is required." }, { status: 400 });
  }

  const result = await removeRosteredDayOff(supabase, user.id, entryId);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  }

  revalidatePerformanceViews();
  return NextResponse.json(result);
}
