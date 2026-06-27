import Link from "next/link";
import { signOut } from "@/lib/actions/authActions";

type DashboardShellProps = {
  children: React.ReactNode;
  userName?: string | null;
};

export default function DashboardShell({ children, userName }: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Commish 2.0</h1>
            {userName && <p className="text-sm text-gray-500">Welcome, {userName}</p>}
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
              Dashboard
            </Link>
            <Link href="/leaderboard" className="text-sm text-gray-600 hover:text-gray-900">
              Leaderboard
            </Link>
            <Link href="/setup" className="text-sm text-gray-600 hover:text-gray-900">
              Setup
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
