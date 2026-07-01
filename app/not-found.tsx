import Link from "next/link";
import { APP_ROUTES } from "@/lib/app/routes";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-8 text-center shadow-[0_10px_25px_rgba(0,74,147,0.08)]">
        <h1 className="text-2xl font-semibold text-[var(--foreground)]">Page not found</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          The page you requested does not exist or may have moved.
        </p>
        <Link
          href={APP_ROUTES.dashboard}
          className="mt-6 inline-flex rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--accent-hover)]"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
