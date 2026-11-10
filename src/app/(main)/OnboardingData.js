import { getUserProfile } from "@/lib/supabase/server";
import { readTourState } from "@/lib/tour/tourConfig";
import ProductTour from "@/components/tour/ProductTour";

// Seperti SidebarData: dibungkus <Suspense> di layout supaya tidak memblokir
// navigasi. Tur interaktif muncul sekali per akun (user_metadata.tour) dan tidak
// muncul sebelum langkah "Lengkapi data" selesai. Pengguna lama yang sudah
// melihat panduan modal versi sebelumnya tidak dipaksa menonton ulang.
export default async function OnboardingData() {
  const { user, profile } = await getUserProfile();
  if (!user || !profile) return null;
  // Tur interaktif hanya muncul setelah langkah "Lengkapi data" selesai.
  // Sumber kebenaran adalah kolom profile_completed_at di database.
  if (profile.profile_completed_at === null) return null;
  const { status, stepId } = readTourState(user.user_metadata);
  return <ProductTour role={profile.role} initialStatus={status} initialStepId={stepId} />;
}
