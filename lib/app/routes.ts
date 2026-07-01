export const APP_ROUTES = {
  dashboard: "/dashboard",
  dailyContacts: "/daily-contacts",
  manualInput: "/setup",
  leaderboard: "/leaderboard",
  compliance: "/compliance",
  settings: "/settings",
} as const;

export type AppRouteKey = keyof typeof APP_ROUTES;

export const APP_NAV_ITEMS: { key: AppRouteKey; label: string; href: string }[] = [
  { key: "dashboard", label: "Dashboard", href: APP_ROUTES.dashboard },
  { key: "dailyContacts", label: "Daily Contacts", href: APP_ROUTES.dailyContacts },
  { key: "manualInput", label: "Manual Input", href: APP_ROUTES.manualInput },
  { key: "leaderboard", label: "Leaderboard", href: APP_ROUTES.leaderboard },
  { key: "compliance", label: "Compliance", href: APP_ROUTES.compliance },
  { key: "settings", label: "Settings", href: APP_ROUTES.settings },
];

export function getActiveNavKey(pathname: string): AppRouteKey {
  if (pathname.startsWith(APP_ROUTES.dailyContacts)) return "dailyContacts";
  if (pathname.startsWith(APP_ROUTES.manualInput)) return "manualInput";
  if (pathname.startsWith(APP_ROUTES.leaderboard)) return "leaderboard";
  if (pathname.startsWith(APP_ROUTES.compliance)) return "compliance";
  if (pathname.startsWith(APP_ROUTES.settings)) return "settings";
  return "dashboard";
}
