import { NextResponse } from "next/server";
import { getPostAuthRedirectPath } from "@/lib/profiles/usernamePersistence";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const formData = await request.formData();

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const redirectTo = data.user
    ? await getPostAuthRedirectPath(supabase, data.user.id)
    : "/setup-username";

  return NextResponse.json({ success: true, redirectTo });
}
