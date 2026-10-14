import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/server";
import Header from "@/components/Header";

// Dipisah dari layout & dibungkus <Suspense> di layout.js supaya fetch
// profile (data runtime, tidak di-cache) tidak memblokir seluruh halaman --
// proxy.js (middleware) sudah menjamin user yang sampai ke sini selalu
// authenticated, redirect di sini murni jaga-jaga.
export default async function HeaderData() {
  const { user, profile } = await getUserProfile();
  if (!user) redirect("/login");
  return <Header fullName={profile?.full_name ?? user.email} role={profile?.role} />;
}
