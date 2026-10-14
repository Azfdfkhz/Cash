import { getUserProfile } from "@/lib/supabase/server";
import ConditionalBottomNav from "@/components/ConditionalBottomNav";

// Dipisah dari layout & dibungkus <Suspense> sendiri (lihat HeaderData.js) --
// getUserProfile() sudah di-cache per-request, jadi ini tidak menambah
// query, cuma resolve dari hasil yang sama dengan HeaderData.
export default async function BottomNavData() {
  const { profile } = await getUserProfile();
  return <ConditionalBottomNav role={profile?.role} />;
}
