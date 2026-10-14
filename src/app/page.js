import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/server";

export default async function HomePage() {
  const { user } = await getUserProfile();
  redirect(user ? "/dashboard" : "/login");
}
