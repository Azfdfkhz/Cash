import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/security";
import { callbackErrorCode, hasUnverifiedOAuthEmail } from "@/lib/authErrors";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  // Penyedia (Google) / Supabase mengembalikan error alih-alih code, mis.
  // pendaftaran ditolak oleh kebijakan domain di database. Tampilkan pesan
  // yang jelas di halaman login, tanpa meneruskan teks mentah.
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=${callbackErrorCode(searchParams)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Akun baru (Google / konfirmasi email) harus melewati langkah 2
      // ("Lengkapi data Anda") dulu. Bila kolom profile_completed_at belum ada
      // (migrasi 0016 belum jalan), query error -> lewati cek ini.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      // Akun dari penyedia OAuth wajib berisi email yang terverifikasi.
      // Diperiksa di server; bila tidak, sesi dibatalkan sebelum dipakai.
      if (user && hasUnverifiedOAuthEmail(user)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/login?error=unverified`);
      }
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("profile_completed_at")
          .eq("id", user.id)
          .single();
        const pending =
          user.user_metadata?.onboarding_pending === true ||
          (!profileError && profile && profile.profile_completed_at === null);
        if (pending) {
          return NextResponse.redirect(`${origin}/register/complete-profile`);
        }
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
