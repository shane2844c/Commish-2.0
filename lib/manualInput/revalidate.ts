import { revalidatePath } from "next/cache";

const PERFORMANCE_PATHS = [
  "/dashboard",
  "/leaderboard",
  "/daily-contacts",
  "/setup",
  "/compliance",
] as const;

export function revalidatePerformanceViews() {
  for (const path of PERFORMANCE_PATHS) {
    revalidatePath(path, "page");
    revalidatePath(path, "layout");
  }
}
