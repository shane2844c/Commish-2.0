"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

type NavItemKey =
  | "dashboard"
  | "leaderboard"
  | "daily-contacts"
  | "manual-input"
  | "compliance"
  | "settings";

type DashboardShellProps = {
  children: React.ReactNode;
  userName?: string | null;
  activeItem?: NavItemKey;
};

const navItems: { key: NavItemKey; label: string; href: string }[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "daily-contacts", label: "Daily Contacts", href: "/daily-contacts" },
  { key: "manual-input", label: "Manual Input", href: "/setup" },
  { key: "leaderboard", label: "Leaderboard", href: "/leaderboard" },
  { key: "compliance", label: "Compliance", href: "/compliance" },
  { key: "settings", label: "Settings", href: "/settings" },
];

export default function DashboardShell({
  children,
  userName,
  activeItem = "dashboard",
}: DashboardShellProps) {
  const [menuOpen, setMenuOpen] = useState(true);

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
            {navItems.map((item) => {
              const isActive = item.key === activeItem;
              return (
                <Link
                  key={item.key}
                  href={item.href}
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
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Brand Theme</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Compare the Market-inspired internal consultant view.
            </p>
          </div>
          <form action="/api/auth/signout" method="post" className="mt-6">
            <button
              type="submit"
              className="w-full rounded-lg border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium text-[var(--muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              Sign out
            </button>
          </form>
        </aside>

        <main className="flex-1 px-4 py-8 sm:px-8">
          <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[0_10px_25px_rgba(0,74,147,0.06)] sm:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
