import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

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
        if (!profileError && profile && profile.profile_completed_at === null) {
          return NextResponse.redirect(`${origin}/register/complete-profile`);
        }
      }
      return NextResponse.redirect(`${origin}${next || "/dashboard"}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
