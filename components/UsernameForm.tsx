"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type UsernameFormProps = {
  initialUsername?: string;
  submitLabel: string;
  redirectTo?: string;
  showCurrentUsername?: boolean;
};

type FormState = {
  error?: string;
  success?: boolean;
  message?: string;
};

export default function UsernameForm({
  initialUsername = "",
  submitLabel,
  redirectTo,
  showCurrentUsername = false,
}: UsernameFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState(initialUsername);
  const [state, setState] = useState<FormState>({});
  const [pending, setPending] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitUsername();
  }

  async function submitUsername() {
    setPending(true);
    setState({});

    const formData = new FormData();
    formData.set("username", username);

    try {
      const response = await fetch("/api/profile/username", {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const result = (await response.json()) as FormState & { username?: string };

      if (!response.ok || result.error) {
        setState({ error: result.error ?? "Failed to save username." });
        return;
      }

      if (redirectTo) {
        router.push(redirectTo);
        router.refresh();
        return;
      }

      setState({ success: true, message: result.message ?? "Username saved." });
      if (result.username) {
        setUsername(result.username);
      }
      router.refresh();
    } catch {
      setState({ error: "Failed to save username." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showCurrentUsername && initialUsername && (
        <div className="rounded-lg border border-[var(--border)] bg-[#f8fbff] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            Current username
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{initialUsername}</p>
        </div>
      )}

      {(state.error || state.success) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            state.error
              ? "border-red-200 bg-[var(--error-soft)] text-red-700"
              : "border-green-200 bg-[var(--success-soft)] text-green-700"
          }`}
        >
          {state.error ?? state.message ?? "Username saved."}
        </div>
      )}

      <label className="block text-sm font-semibold text-[var(--muted)]">
        Username
        <input
          name="username"
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          minLength={3}
          maxLength={20}
          pattern="[A-Za-z0-9._]{3,20}"
          required
          className={inputClass}
          placeholder="your.username"
        />
      </label>
      <p className="text-xs text-[var(--muted)]">
        3–20 characters. Letters, numbers, dots, and underscores only.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--brand)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)] disabled:opacity-50"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[#dbe9fb]";
