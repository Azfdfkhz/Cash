import { getUserProfile } from "@/lib/supabase/server";
import HelpCenter from "@/components/help/HelpCenter";

export const metadata = { title: "Pusat bantuan" };

export default async function HelpPage() {
  const { profile } = await getUserProfile();
  return <HelpCenter defaultRole={profile?.role} canReplayTour />;
}
