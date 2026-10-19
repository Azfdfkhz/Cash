import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { uploadReceiptToDrive } from "@/lib/google/drive";
import { caDriveFilename, caDriveFolder } from "@/lib/google/driveNames";

export const runtime = "nodejs";

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const cashAdvanceId = formData.get("cashAdvanceId");
  const kind = formData.get("kind") || "kwitansi";
  const label = formData.get("label");

  if (!file || !cashAdvanceId) {
    return NextResponse.json(
      { error: "file dan cashAdvanceId wajib diisi" },
      { status: 400 }
    );
  }

  let { data: cashAdvance } = await supabase
    .from("cash_advances")
    .select("purpose, created_at, kind, profiles:requester_id(full_name)")
    .eq("id", cashAdvanceId)
    .maybeSingle();

  // Reimbursement baru: file bukti diunggah SEBELUM barisnya dibuat (lewat
  // create_reimbursement dengan id yang sama), jadi folder dinamai dari
  // data draf. Hanya berlaku kalau id itu memang belum dipakai -- baris
  // yang tidak terlihat oleh user (RLS) juga dianggap tidak ada di sini, tapi
  // create_reimbursement tetap akan gagal kalau id sudah dipakai.
  const draftPurpose = formData.get("draftPurpose");
  if (!cashAdvance && draftPurpose) {
    const { data: me } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    cashAdvance = {
      purpose: String(draftPurpose).slice(0, 100),
      created_at: new Date().toISOString(),
      kind: "reimbursement",
      profiles: { full_name: me?.full_name },
    };
  }

  if (!cashAdvance) {
    return NextResponse.json(
      { error: "Pengajuan tidak ditemukan." },
      { status: 404 }
    );
  }

  let buffer = Buffer.from(await file.arrayBuffer());
  let mimeType = file.type || "application/octet-stream";

  // Lapisan kedua (client sudah mengubah foto ke JPEG): foto yang masih
  // bukan JPEG (PNG, WebP, HEIC dari browser lama) diubah ke JPEG kalau
  // sharp bisa membacanya. Kalau tidak bisa (mis. HEIC), simpan apa adanya --
  // pratinjau & laporan memakai render Drive sebagai cadangan.
  const isPdf = buffer.subarray(0, 4).toString() === "%PDF";
  if (!isPdf && mimeType !== "image/jpeg") {
    try {
      buffer = await sharp(buffer)
        .rotate()
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      mimeType = "image/jpeg";
    } catch (err) {
      console.warn("Upload: tidak bisa diubah ke JPEG, simpan file asli", file.name, err.message);
    }
  }
  const ext = isPdf
    ? "pdf"
    : mimeType === "image/jpeg"
      ? "jpg"
      : (file.name?.match(/\.([a-z0-9]+)$/i)?.[1] || mimeType.split("/")[1] || "bin").toLowerCase();
  const filename = caDriveFilename(cashAdvanceId, cashAdvance, { kind, label, ext });
  const { folderName, legacyFolderNames } = caDriveFolder(cashAdvanceId, cashAdvance);

  try {
    const { fileId, viewUrl } = await uploadReceiptToDrive({
      buffer,
      filename,
      mimeType,
      folderName,
      legacyFolderNames,
    });
    return NextResponse.json({ ok: true, fileId, viewUrl });
  } catch (err) {
    console.error("Drive upload failed", err);
    return NextResponse.json(
      { error: "Gagal mengunggah foto ke shared drive." },
      { status: 500 }
    );
  }
}
