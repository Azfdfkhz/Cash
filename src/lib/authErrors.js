// Pemetaan error autentikasi ke pesan yang aman & jelas untuk pengguna.
// Prinsip: tidak menampilkan pesan mentah dari Supabase/Postgres (bisa memuat
// detail internal) dan tidak menyebut daftar domain yang diizinkan.

// Kalimat ini juga dipakai oleh fungsi database (migrasi 0031) sebagai pesan
// penolakan, sehingga bisa dikenali di sini. Jangan diubah sepihak.
export const DOMAIN_REJECTION_MARKER = "email resmi organisasi";

export const AUTH_MESSAGES = {
  domain:
    "Pendaftaran hanya untuk email resmi organisasi. Gunakan email organisasi Anda, atau hubungi administrator bila Anda merasa ini keliru.",
  unverified:
    "Email akun Google Anda belum terverifikasi, sehingga tidak dapat dipakai. Verifikasi email tersebut di Google lalu coba lagi.",
  rateLimited: "Terlalu sering mendaftar. Tunggu beberapa saat lalu coba lagi.",
  weakPassword: "Kata sandi terlalu lemah. Gunakan minimal 8 karakter dengan kombinasi yang lebih sulit ditebak.",
  generic: "Pendaftaran gagal. Periksa data Anda lalu coba lagi.",
  oauth: "Gagal masuk dengan Google. Coba lagi.",
};

// Supabase menyampaikan penolakan trigger sebagai "Database error saving new
// user" (kode unexpected_failure) dan penolakan Auth Hook sebagai pesan hook.
// Dua-duanya dianggap penolakan pendaftaran. Penyebab lain pada pesan generik
// itu bisa saja bukan domain; pesannya sengaja mengarahkan ke administrator.
export function isSignupRejection(input) {
  const text = String(input?.message ?? input?.error_description ?? input ?? "").toLowerCase();
  const code = String(input?.code ?? input?.error_code ?? "").toLowerCase();
  return (
    text.includes(DOMAIN_REJECTION_MARKER) ||
    text.includes("database error saving new user") ||
    code === "unexpected_failure" ||
    code === "hook_payload_invalid_content_type" ||
    code === "user_creation_blocked"
  );
}

export function mapSignupError(error) {
  if (!error) return "";
  const code = String(error.code ?? "").toLowerCase();
  if (error.status === 429 || code === "over_email_send_rate_limit" || /rate limit/i.test(error.message ?? "")) {
    return AUTH_MESSAGES.rateLimited;
  }
  if (code === "weak_password") return AUTH_MESSAGES.weakPassword;
  if (isSignupRejection(error)) return AUTH_MESSAGES.domain;
  return AUTH_MESSAGES.generic;
}

// Parameter ?error= pada halaman login (diisi /auth/callback).
export function loginErrorMessage(code) {
  switch (code) {
    case "domain":
      return AUTH_MESSAGES.domain;
    case "unverified":
      return AUTH_MESSAGES.unverified;
    case "auth":
      return AUTH_MESSAGES.oauth;
    default:
      return "";
  }
}

// Dipakai callback: dari query error provider (error / error_code /
// error_description) menentukan kode ?error= untuk halaman login.
export function callbackErrorCode(params) {
  const description = params.get("error_description");
  const code = params.get("error_code");
  if (!description && !code && !params.get("error")) return "auth";
  return isSignupRejection({ message: description, code }) ? "domain" : "auth";
}

// Untuk akun non-email (Google): email dari penyedia harus terverifikasi.
// Hanya menolak bila penyedia menyatakan eksplisit BELUM terverifikasi
// (email_verified === false), supaya tidak salah menolak penyedia yang tidak
// mengirim penanda sama sekali.
export function hasUnverifiedOAuthEmail(user) {
  const identities = user?.identities ?? [];
  return identities.some(
    (i) => i.provider !== "email" && i.identity_data?.email_verified === false
  );
}
