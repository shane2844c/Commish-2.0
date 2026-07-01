import { redirect } from "next/navigation";
import { getPostAuthRedirectPath } from "@/lib/profiles/usernamePersistence";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(await getPostAuthRedirectPath(supabase, user.id));
  }

  redirect("/login");
}
