import { revalidatePath } from "next/cache";

export function revalidatePerformanceViews() {
  revalidatePath("/dashboard");
  revalidatePath("/leaderboard");
  revalidatePath("/daily-contacts");
  revalidatePath("/setup");
  revalidatePath("/compliance");
}
