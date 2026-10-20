import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { uploadReceiptToDrive } from "@/lib/google/drive";
import { caDriveFilename, caDriveFolder } from "@/lib/google/driveNames";
import {
  checkRateLimit,
  detectFileType,
  isBlob,
  isUuid,
  tooManyRequests,
} from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 30;

// Foto dari client sudah diperkecil ke JPEG (<~2 MB); PDF dibatasi 8 MB.
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
// Cegah "decompression bomb": gambar kecil di disk tapi miliaran piksel.
const MAX_INPUT_PIXELS = 40_000_000;

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Tolak lebih awal berdasarkan Content-Length, sebelum body dibaca ke memori.
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_UPLOAD_BYTES + 512 * 1024) {
    return NextResponse.json({ error: "Ukuran file maksimal 8 MB." }, { status: 413 });
  }

  if (!(await checkRateLimit(supabase, "upload", { max: 40, windowSeconds: 300 }))) {
    return tooManyRequests("Terlalu banyak unggahan. Tunggu beberapa menit lalu coba lagi.", 120);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }
  const file = formData.get("file");
  const cashAdvanceId = formData.get("cashAdvanceId");
  const kind = String(formData.get("kind") || "kwitansi").slice(0, 40);
  const label = formData.get("label") ? String(formData.get("label")).slice(0, 60) : null;

  if (!isBlob(file) || !cashAdvanceId) {
    return NextResponse.json(
      { error: "file dan cashAdvanceId wajib diisi" },
      { status: 400 }
    );
  }
  if (!isUuid(cashAdvanceId)) {
    return NextResponse.json({ error: "cashAdvanceId tidak valid." }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Ukuran file harus antara 1 byte dan 8 MB." },
      { status: 413 }
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

  // Jenis file ditentukan dari ISI file. File lain (HTML, exe, zip, dst.)
  // ditolak: file ini akan dibuat publik di Drive organisasi.
  const detected = detectFileType(buffer);
  if (!detected) {
    return NextResponse.json(
      { error: "Format file tidak didukung. Gunakan foto (JPG, PNG, WebP, HEIC) atau PDF." },
      { status: 415 }
    );
  }

  let mimeType = detected.mime;
  let ext = detected.ext;

  // JPEG & PDF disimpan apa adanya (client sudah mengubah foto ke JPEG).
  // PNG/WebP diubah ke JPEG; HEIC dicoba diubah, bila sharp tidak bisa
  // membacanya (build prebuilt tanpa HEIF) disimpan apa adanya -- pratinjau &
  // laporan memakai render Drive sebagai cadangan.
  if (detected.kind === "png" || detected.kind === "webp" || detected.kind === "heic") {
    try {
      buffer = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
        .rotate()
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      mimeType = "image/jpeg";
      ext = "jpg";
    } catch (err) {
      if (detected.kind !== "heic") {
        console.warn("Upload: gambar rusak/terlalu besar", err.message);
        return NextResponse.json(
          { error: "Gambar rusak atau resolusinya terlalu besar." },
          { status: 422 }
        );
      }
      console.warn("Upload: HEIC disimpan apa adanya", err.message);
    }
  }
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
