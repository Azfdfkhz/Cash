import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component; middleware handles refresh
          }
        },
      },
    }
  );
}

// Setiap layout dan page di bawah (main) memanggil getUserProfile() sendiri-
// sendiri. Dibungkus React.cache supaya dalam satu request server (layout +
// page) hanya ada satu auth.getUser() + satu query profiles, bukan dua kali.
export const getUserProfile = cache(async function getUserProfile() {
  const supabase = await createClient();
  // Lihat catatan di middleware.js: verifikasi JWT lokal, tanpa round-trip.
  // Operasi tulis di API route tetap memakai auth.getUser() (otoritatif).
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const user = claims
    ? {
        id: claims.sub,
        email: claims.email,
        user_metadata: claims.user_metadata ?? {},
        app_metadata: claims.app_metadata ?? {},
      }
    : null;

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile };
});
