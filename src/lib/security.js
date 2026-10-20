import { NextResponse } from "next/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === "string" && UUID_RE.test(value);
}

// Hanya izinkan path relatif di domain yang sama. Mencegah open redirect
// seperti ?next=https://evil.com, ?next=//evil.com, ?next=/\evil.com atau
// ?next=@evil.com (yang jadi https://situs@evil.com bila ditempel ke origin).
export function safeNextPath(next, fallback = "/dashboard") {
  if (typeof next !== "string") return fallback;
  const value = next.trim();
  if (!value.startsWith("/") || value.startsWith("//") || /[\\\r\n\t]/.test(value)) {
    return fallback;
  }
  try {
    const url = new URL(value, "http://localhost");
    if (url.origin !== "http://localhost") return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

// Deteksi jenis file dari isi (magic bytes), BUKAN dari nama / Content-Type
// kiriman client yang bisa dipalsukan.
export function detectFileType(buffer) {
  if (!buffer || buffer.length < 12) return null;
  if (buffer.subarray(0, 4).toString("latin1") === "%PDF") {
    return { kind: "pdf", mime: "application/pdf", ext: "pdf" };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { kind: "jpeg", mime: "image/jpeg", ext: "jpg" };
  }
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { kind: "png", mime: "image/png", ext: "png" };
  }
  if (
    buffer.subarray(0, 4).toString("latin1") === "RIFF" &&
    buffer.subarray(8, 12).toString("latin1") === "WEBP"
  ) {
    return { kind: "webp", mime: "image/webp", ext: "webp" };
  }
  if (buffer.subarray(4, 8).toString("latin1") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("latin1");
    if (["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(brand)) {
      return { kind: "heic", mime: "image/heic", ext: "heic" };
    }
  }
  return null;
}

export function isBlob(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.arrayBuffer === "function" &&
    typeof value.size === "number"
  );
}

// Batas laju per user lewat fungsi DB public.rate_limit_hit (migrasi 0030).
// Mengembalikan true bila boleh lanjut. FAIL-OPEN: bila fungsi belum ada
// (migrasi belum dijalankan) atau DB error, request tetap lolos supaya
// aplikasi tidak down karena pembatas laju itu sendiri.
export async function checkRateLimit(
  supabase,
  action,
  { max, windowSeconds, subject = null, subjectMax = null }
) {
  try {
    const { data, error } = await supabase.rpc("rate_limit_hit", {
      p_action: action,
      p_max: max,
      p_window_seconds: windowSeconds,
      p_subject: subject,
      p_subject_max: subjectMax,
    });
    if (error) {
      console.warn("rate_limit_hit gagal, dilewati:", error.message);
      return true;
    }
    return data !== false;
  } catch (err) {
    console.warn("rate_limit_hit error, dilewati:", err?.message);
    return true;
  }
}

export function tooManyRequests(
  message = "Terlalu banyak permintaan. Tunggu beberapa saat lalu coba lagi.",
  retryAfterSeconds = 60
) {
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

// fetch dengan batas waktu, supaya layanan eksternal yang macet (Telegram,
// Google) tidak menahan fungsi serverless sampai timeout dan menumpuk.
export function fetchWithTimeout(url, options = {}, ms = 8000) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(ms) });
}
