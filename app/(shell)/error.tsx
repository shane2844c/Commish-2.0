"use client";

import Link from "next/link";
import { useEffect } from "react";

function getErrorMessage(error: Error & { digest?: string }): string {
  if (error instanceof Error && error.message && error.message !== "[object Event]") {
    return error.message;
  }

  if (typeof Event !== "undefined" && error instanceof Event) {
    return "A page script failed to load. Stop the dev server, delete the .next folder, and run npm run dev:clean.";
  }

  if (error.message === "[object Event]") {
    return "A page script failed to load. Stop the dev server, delete the .next folder, and run npm run dev:clean.";
  }

  return "The page failed to load.";
}

export default function ShellError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message = getErrorMessage(error);

  return (
    <div className="rounded-xl border border-red-200 bg-[var(--error-soft)] p-6 text-center">
      <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
      <p className="mt-2 text-sm text-red-700">{message}</p>
      <div className="mt-4 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-dark)]"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg border border-[var(--brand)] px-4 py-2 text-sm font-medium text-[var(--brand)] hover:bg-[var(--brand-soft)]"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
