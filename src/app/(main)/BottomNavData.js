import { getUserProfile } from "@/lib/supabase/server";
import { getDashboardStats } from "@/lib/stats";
import ConditionalBottomNav from "@/components/ConditionalBottomNav";

// Dipisah & dibungkus <Suspense> sendiri (lihat layout.js). getUserProfile()
// dan getDashboardStats() sama-sama di-cache per-request, jadi tidak
// menambah query dibanding SidebarData / halaman Beranda.
export default async function BottomNavData() {
  const { profile } = await getUserProfile();
  const pendingCount =
    profile?.role === "operational"
      ? (await getDashboardStats()).pendingCount
      : 0;
  return <ConditionalBottomNav role={profile?.role} pendingCount={pendingCount} />;
}
