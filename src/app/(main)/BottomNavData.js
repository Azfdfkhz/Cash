import { getUserProfile } from "@/lib/supabase/server";
import { EMPTY_APPROVAL_COUNTS, getApprovalBadgeCount } from "@/lib/stats";
import ConditionalBottomNav from "@/components/ConditionalBottomNav";

// Dipisah & dibungkus <Suspense> sendiri (lihat layout.js). getUserProfile()
// dan getApprovalBadgeCount() sama-sama di-cache per-request, jadi tidak
// menambah query dibanding SidebarData / halaman Beranda.
export default async function BottomNavData() {
  const { profile } = await getUserProfile();
  const pendingCounts =
    profile?.role === "operational"
      ? await getApprovalBadgeCount(profile.id)
      : EMPTY_APPROVAL_COUNTS;
  return (
    <ConditionalBottomNav
      role={profile?.role}
      pendingCounts={pendingCounts}
      userId={profile?.id}
    />
  );
}
