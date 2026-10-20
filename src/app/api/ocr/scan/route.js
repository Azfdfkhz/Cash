import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractReceiptText, parseReceiptFields } from "@/lib/google/vision";
import { checkRateLimit, detectFileType, tooManyRequests } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 30;

// ~6 MB data asli setelah base64. Foto kwitansi dari client sudah diperkecil.
const MAX_BASE64_CHARS = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BASE64_CHARS + 4096) {
    return NextResponse.json({ error: "File terlalu besar untuk dipindai." }, { status: 413 });
  }

  // Setiap panggilan = biaya Google Vision, jadi dibatasi per user.
  if (!(await checkRateLimit(supabase, "ocr", { max: 30, windowSeconds: 300 }))) {
    return tooManyRequests("Terlalu banyak pemindaian. Tunggu beberapa menit atau isi data manual.", 120);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }
  const { imageBase64 } = body ?? {};
  const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "image/jpeg";

  if (typeof imageBase64 !== "string" || !imageBase64) {
    return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
  }
  if (imageBase64.length > MAX_BASE64_CHARS) {
    return NextResponse.json({ error: "File terlalu besar untuk dipindai." }, { status: 413 });
  }
  if (!ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json(
      { error: "Format tidak didukung untuk pemindaian. Isi data secara manual." },
      { status: 415 }
    );
  }

  // Pastikan isinya benar-benar gambar/PDF yang sesuai (bukan data sembarang).
  const detected = detectFileType(Buffer.from(imageBase64.slice(0, 64), "base64"));
  if (!detected || (detected.kind === "pdf") !== (mimeType === "application/pdf")) {
    return NextResponse.json({ error: "Isi file tidak sesuai formatnya." }, { status: 415 });
  }

  try {
    const text = await extractReceiptText(imageBase64, mimeType);
    const fields = parseReceiptFields(text);
    return NextResponse.json({ ok: true, ...fields });
  } catch (err) {
    console.error("OCR scan failed", err);
    const message =
      mimeType === "application/pdf"
        ? "Gagal membaca kwitansi dari PDF. Silakan isi data secara manual."
        : "Gagal membaca kwitansi. Coba foto ulang dengan pencahayaan lebih baik.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
