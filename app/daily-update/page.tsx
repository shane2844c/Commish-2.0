import { redirect } from "next/navigation";
import { APP_ROUTES } from "@/lib/app/routes";

export default function DailyUpdatePage() {
  redirect(APP_ROUTES.dailyContacts);
}
