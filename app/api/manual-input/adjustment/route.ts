import { NextResponse } from "next/server";
import { persistManualAdjustment } from "@/lib/manualInput/persistence";
import { revalidatePerformanceViews } from "@/lib/manualInput/revalidate";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const formData = await request.formData();
  const result = await persistManualAdjustment(supabase, formData);

  if (result.error) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status ?? 400 }
    );
  }

  revalidatePerformanceViews();
  return NextResponse.json(result);
}
