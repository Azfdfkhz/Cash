import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/security";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

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
