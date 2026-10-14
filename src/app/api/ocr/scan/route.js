import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractReceiptText, parseReceiptFields } from "@/lib/google/vision";

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { imageBase64, mimeType } = await request.json();
  if (!imageBase64) {
    return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
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
