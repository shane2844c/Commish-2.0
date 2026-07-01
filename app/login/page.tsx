import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getPostAuthRedirectPath } from "@/lib/profiles/usernamePersistence";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(await getPostAuthRedirectPath(supabase, user.id));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <LoginForm />
    </div>
  );
}
