import { getUserProfile } from "@/lib/supabase/server";
import { getApprovalBadgeCount } from "@/lib/stats";
import ConditionalBottomNav from "@/components/ConditionalBottomNav";

// Dipisah & dibungkus <Suspense> sendiri (lihat layout.js). getUserProfile()
// dan getApprovalBadgeCount() sama-sama di-cache per-request, jadi tidak
// menambah query dibanding SidebarData / halaman Beranda.
export default async function BottomNavData() {
  const { profile } = await getUserProfile();
  const pendingCount =
    profile?.role === "operational"
      ? await getApprovalBadgeCount(profile.id)
      : 0;
  return (
    <ConditionalBottomNav
      role={profile?.role}
      pendingCount={pendingCount}
      userId={profile?.id}
    />
  );
}
