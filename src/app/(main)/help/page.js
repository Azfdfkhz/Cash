import { getUserProfile } from "@/lib/supabase/server";
import HelpCenter from "@/components/help/HelpCenter";
import { getHelpContent } from "@/lib/helpContent";

export const metadata = { title: "Pusat bantuan" };

// Pusat bantuan tersedia untuk semua pengguna yang sudah masuk. Panduan Tim
// Operasional dipilih DI SINI (server) hanya bila profile.role === "operational".
export default async function HelpPage() {
  const { profile } = await getUserProfile();
  return <HelpCenter content={getHelpContent(profile?.role)} canReplayTour />;
}
