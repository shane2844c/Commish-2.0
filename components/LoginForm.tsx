"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import AuthTabs from "@/components/ui/AuthTabs";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";

type AuthFormState = {
  error?: string;
};

export default function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [state, setState] = useState<AuthFormState>({});
  const [pending, setPending] = useState(false);

  const isSignup = mode === "signup";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    void submitAuth(formData);
  }

  async function submitAuth(formData: FormData) {
    setPending(true);
    setState({});

    const endpoint = isSignup ? "/api/auth/signup" : "/api/auth/login";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as AuthFormState & {
        success?: boolean;
        redirectTo?: string;
      };

      if (!response.ok || result.error) {
        setState({ error: result.error ?? "Authentication failed." });
        return;
      }

      router.push(result.redirectTo ?? "/dashboard");
      router.refresh();
    } catch {
      setState({ error: "Authentication failed. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-8">
      <h1 className="commish-auth-title text-2xl font-semibold text-[var(--foreground)]">Commish 2.0</h1>
      <p className="commish-auth-subtitle mt-1 text-sm text-[var(--muted)]">
        Sales performance dashboard
      </p>

      <AuthTabs
        active={mode}
        onLogin={() => setMode("login")}
        onSignup={() => setMode("signup")}
      />

      {state.error ? (
        <div className="commish-alert-error mt-4 rounded-lg border border-red-200 bg-[var(--error-soft)] px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {isSignup ? (
          <label className="commish-field block">
            <span className="commish-label text-sm font-semibold text-[var(--muted)]">Full Name</span>
            <Input id="fullName" name="fullName" type="text" required />
          </label>
        ) : null}
        <label className="commish-field block">
          <span className="commish-label text-sm font-semibold text-[var(--muted)]">Email</span>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </label>
        <label className="commish-field block">
          <span className="commish-label text-sm font-semibold text-[var(--muted)]">Password</span>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete={isSignup ? "new-password" : "current-password"}
          />
        </label>
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? "Please wait..." : isSignup ? "Create account" : "Log in"}
        </Button>
      </form>
    </Card>
  );
}
