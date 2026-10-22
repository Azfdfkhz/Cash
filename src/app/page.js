import { redirect } from "next/navigation";
import { getUserProfile } from "@/lib/supabase/server";

export default async function HomePage({ searchParams }) {
  const params = await searchParams;

  // Bila URL callback tidak ada di daftar Redirect URLs Supabase, Supabase
  // mengembalikan pengguna ke Site URL ("/") membawa ?code=. Tanpa ini kode
  // itu terbuang, pengguna dilempar ke /login dan harus menekan tombol Google
  // sekali lagi. Teruskan ke /auth/callback supaya sesi tetap dibuat.
  const code = typeof params?.code === "string" ? params.code : null;
  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}`);
  }
  if (params?.error || params?.error_description) {
    const q = new URLSearchParams();
    for (const key of ["error", "error_code", "error_description"]) {
      if (typeof params[key] === "string") q.set(key, params[key]);
    }
    redirect(`/auth/callback?${q.toString()}`);
  }

  const { user } = await getUserProfile();
  redirect(user ? "/dashboard" : "/login");
}
