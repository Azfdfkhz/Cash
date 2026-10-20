import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/server";
import { getApprovalBadgeCount } from "@/lib/stats";
import Sidebar from "@/components/Sidebar";

// Dipisah dari layout & dibungkus <Suspense> (lihat layout.js) supaya fetch
// profile tidak memblokir navigasi. proxy.js menjamin user sudah login;
// redirect di sini hanya jaga-jaga.
export default async function SidebarData() {
  const { user, profile } = await getUserProfile();
  if (!user) redirect("/login");
  const isOperational = profile?.role === "operational";
  const pendingCount = isOperational
    ? await getApprovalBadgeCount(profile.id)
    : 0;
  return (
    <Sidebar
      role={profile?.role}
      fullName={profile?.full_name ?? user.email}
      pendingCount={pendingCount}
      userId={profile?.id}
    />
  );
}
