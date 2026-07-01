import { NextResponse } from "next/server";
import { saveProfileUsername } from "@/lib/profiles/usernamePersistence";
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
  const username = String(formData.get("username") ?? "");

  const result = await saveProfileUsername(supabase, user.id, username);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    message: "Username saved.",
    username: result.username,
  });
}
