import { redirect } from "next/navigation";
import AuthScreen from "@/components/auth/AuthScreen";
import LoginForm from "@/components/LoginForm";
import { getPostAuthRedirectPath } from "@/lib/profiles/usernamePersistence";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(await getPostAuthRedirectPath(supabase, user.id));
  }

  return (
    <AuthScreen>
      <LoginForm />
    </AuthScreen>
  );
}
