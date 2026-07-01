import { NextResponse } from "next/server";
import { persistComplianceScores } from "@/lib/compliance/persistence";
import { revalidatePerformanceViews } from "@/lib/manualInput/revalidate";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const formData = await request.formData();
  const result = await persistComplianceScores(supabase, formData);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.status ?? 400 });
  }

  revalidatePerformanceViews();
  return NextResponse.json(result);
}
