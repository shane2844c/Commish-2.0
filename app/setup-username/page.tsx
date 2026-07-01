import { redirect } from "next/navigation";
import UsernameForm from "@/components/UsernameForm";
import { hasUsername } from "@/lib/profiles/usernameValidation";
import { createClient } from "@/lib/supabase/server";

export default async function SetupUsernamePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (hasUsername(profile?.username)) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-8 shadow-[0_10px_25px_rgba(0,74,147,0.08)]">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Choose your username</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Create a username before accessing the app. This is how you&apos;ll appear on the
          leaderboard and across Commish.
        </p>
        <div className="mt-6">
          <UsernameForm submitLabel="Save username" redirectTo="/dashboard" />
        </div>
      </div>
    </div>
  );
}
