"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { APP_NAV_ITEMS, getActiveNavKey } from "@/lib/app/routes";

type AppShellProps = {
  children: React.ReactNode;
  userName?: string | null;
};

/**
 * Single application shell for all authenticated routes under app/(app)/.
 * Do not duplicate header, sidebar, or nav in page components.
 * app/(app)/layout.tsx is the only place that should render this component.
 */
export default function AppShell({ children, userName }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const activeItem = getActiveNavKey(pathname);
  const [menuOpen, setMenuOpen] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      router.push("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-expanded={menuOpen}
            className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--brand-soft)]"
          >
            <span className="text-[var(--brand)]">≡</span>
            {menuOpen ? "Close" : "Menu"}
          </button>
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 overflow-hidden">
              <Image
                src="/ctm-logo-mascot-plain.png"
                alt="Compare the Market mascot"
                width={56}
                height={56}
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div className="leading-none">
              <p className="text-2xl font-bold tracking-tight text-[var(--brand)]">
                compare
                <span className="font-medium text-[var(--brand-dark)]">themarket</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-[var(--foreground)]">{userName ?? "Consultant"}</p>
            <p className="text-xs text-[var(--muted)]">Sales Performance Dashboard</p>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1400px]">
        <aside
          className={`border-r border-[var(--border)] bg-white p-4 lg:min-h-[calc(100vh-80px)] ${
            menuOpen ? "w-[250px]" : "hidden"
          }`}
        >
          <nav className="space-y-1">
            {APP_NAV_ITEMS.map((item) => {
              const isActive = item.key === activeItem;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  prefetch
                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                      : "text-[var(--muted)] hover:bg-[#f7faff] hover:text-[var(--brand-dark)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-8 rounded-lg border border-[var(--border)] bg-[#f9fbfe] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Signed in as</p>
            <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{userName ?? "Consultant"}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void handleSignOut();
            }}
            disabled={signingOut}
            className="mt-6 w-full rounded-lg border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:opacity-50"
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </aside>

        <main className="flex-1 bg-[var(--background)] px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
