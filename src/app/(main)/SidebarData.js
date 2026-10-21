import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/server";
import { EMPTY_APPROVAL_COUNTS, getApprovalBadgeCount } from "@/lib/stats";
import Sidebar from "@/components/Sidebar";

// Dipisah dari layout & dibungkus <Suspense> (lihat layout.js) supaya fetch
// profile tidak memblokir navigasi. proxy.js menjamin user sudah login;
// redirect di sini hanya jaga-jaga.
export default async function SidebarData() {
  const { user, profile } = await getUserProfile();
  if (!user) redirect("/login");
  const isOperational = profile?.role === "operational";
  const pendingCounts = isOperational
    ? await getApprovalBadgeCount(profile.id)
    : EMPTY_APPROVAL_COUNTS;
  return (
    <Sidebar
      role={profile?.role}
      fullName={profile?.username || profile?.full_name || user.email}
      pendingCounts={pendingCounts}
      userId={profile?.id}
    />
  );
}
