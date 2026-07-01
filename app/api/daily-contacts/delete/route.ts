import { NextResponse } from "next/server";
import { removeDailyContact } from "@/lib/dailyContacts/persistence";
import { revalidatePerformanceViews } from "@/lib/manualInput/revalidate";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const formData = await request.formData();
  const entryId = String(formData.get("entryId") ?? "");
  const result = await removeDailyContact(supabase, entryId);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  }

  revalidatePerformanceViews();
  return NextResponse.json(result);
}
