import Link from "next/link";
import AppCard from "./AppCard";

type AppEmptyStateProps = {
  title: string;
  message: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
};

export default function AppEmptyState({
  title,
  message,
  actionHref,
  actionLabel,
}: AppEmptyStateProps) {
  return (
    <AppCard className="p-8 text-center">
      <h3 className="text-lg font-medium text-[var(--foreground)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--muted)]">{message}</p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-6 inline-block rounded-lg bg-[var(--brand)] px-6 py-2.5 text-sm font-medium text-white hover:bg-[var(--brand-dark)]"
        >
          {actionLabel}
        </Link>
      ) : null}
    </AppCard>
  );
}
