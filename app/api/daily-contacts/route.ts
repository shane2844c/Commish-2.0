import { NextResponse } from "next/server";
import { persistDailyContact } from "@/lib/dailyContacts/persistence";
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
  const result = await persistDailyContact(supabase, user.id, formData);

  if (result.error) {
    return NextResponse.json(result, { status: 400 });
  }

  revalidatePerformanceViews();
  return NextResponse.json(result);
}
