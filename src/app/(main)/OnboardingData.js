import { getUserProfile } from "@/lib/supabase/server";
import { ONBOARDING_VERSION } from "@/lib/helpContent";
import OnboardingTour from "@/components/help/OnboardingTour";

// Seperti SidebarData: dibungkus <Suspense> di layout supaya tidak memblokir
// navigasi. Panduan hanya muncul sekali per akun (metadata onboarding_seen)
// dan tidak muncul sebelum langkah "Lengkapi data" selesai.
export default async function OnboardingData() {
  const { user, profile } = await getUserProfile();
  if (!user || !profile) return null;
  if (user.user_metadata?.onboarding_pending === true) return null;
  const seen = user.user_metadata?.onboarding_seen === ONBOARDING_VERSION;
  return <OnboardingTour role={profile.role} seen={seen} />;
}
