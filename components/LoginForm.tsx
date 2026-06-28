"use client";

import { useActionState, useState } from "react";
import { signIn, signUp } from "@/lib/actions/authActions";

export default function LoginForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loginState, loginAction, loginPending] = useActionState(signIn, {});
  const [signupState, signupAction, signupPending] = useActionState(signUp, {});

  const isSignup = mode === "signup";
  const state = isSignup ? signupState : loginState;
  const action = isSignup ? signupAction : loginAction;
  const pending = isSignup ? signupPending : loginPending;

  const inputClass =
    "mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[#dbe9fb]";
  const labelClass = "block text-sm font-semibold text-[var(--muted)]";

  return (
    <div className="w-full max-w-md">
      <div className="rounded-2xl border border-[var(--border)] bg-white p-8 shadow-[0_10px_25px_rgba(0,74,147,0.08)]">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Commish 2.0</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Sales performance dashboard</p>

        <div className="mt-6 flex rounded-lg border border-[var(--border)] p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded px-3 py-2 text-sm font-medium ${
              !isSignup
                ? "bg-[var(--brand)] text-white"
                : "text-[var(--muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-dark)]"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded px-3 py-2 text-sm font-medium ${
              isSignup
                ? "bg-[var(--brand)] text-white"
                : "text-[var(--muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--brand-dark)]"
            }`}
          >
            Create account
          </button>
        </div>

        {state.error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-[var(--error-soft)] px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <form action={action} className="mt-6 space-y-4">
          {isSignup && (
            <div>
              <label htmlFor="fullName" className={labelClass}>
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                className={inputClass}
                required
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input id="email" name="email" type="email" className={inputClass} required />
          </div>
          <div>
            <label htmlFor="password" className={labelClass}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className={inputClass}
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-50"
          >
            {pending ? "Please wait..." : isSignup ? "Create account" : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}
