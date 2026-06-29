import { NextResponse } from "next/server";
import { removeDailyContact } from "@/lib/dailyContacts/persistence";
import { revalidatePerformanceViews } from "@/lib/manualInput/revalidate";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  }

  const formData = await request.formData();
  const entryId = String(formData.get("entryId") ?? "");
  const result = await removeDailyContact(supabase, user.id, entryId);

  if (result.error) {
    return NextResponse.json(result, { status: 400 });
  }

  revalidatePerformanceViews();
  return NextResponse.json(result);
}
