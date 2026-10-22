import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
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

// Sidik jari visual 64-bit (dHash): gambar dikecilkan ke 9x8 abu-abu, tiap bit
// = apakah piksel kiri lebih terang dari kanannya. Tahan terhadap simpan ulang,
// kompresi, dan pengecilan, jadi foto yang sama tetap terdeteksi.
async function perceptualHash(buffer) {
  const { data } = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .grayscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let bits = 0n;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      bits = (bits << 1n) | (data[y * 9 + x] > data[y * 9 + x + 1] ? 1n : 0n);
    }
  }
  return bits.toString(16).padStart(16, "0");
}

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

  // Bukti transfer pencairan: satu bukti hanya boleh dipakai satu kali. Dicek
  // SEBELUM diunggah ke Drive supaya file duplikat tidak ikut tersimpan.
  // Pemeriksaan yang mengikat tetap ada di database (mark_cash_advance_disbursed).
  let proofSha256 = null;
  let proofPhash = null;
  if (kind === "bukti-pencairan") {
    proofSha256 = createHash("sha256").update(buffer).digest("hex");
    if (mimeType.startsWith("image/")) {
      try {
        proofPhash = await perceptualHash(buffer);
      } catch (err) {
        console.warn("Upload: phash gagal, hanya sha256 yang dipakai", err.message);
      }
    }
    const { data: duplicateId, error: dupError } = await supabase.rpc(
      "find_duplicate_disbursement_proof",
      { p_sha256: proofSha256, p_phash: proofPhash, p_exclude: cashAdvanceId }
    );
    if (!dupError && duplicateId) {
      return NextResponse.json(
        {
          error:
            "Bukti transfer ini sudah pernah dipakai pada pengajuan lain. Gunakan bukti transfer yang berbeda.",
          code: "duplicate_proof",
        },
        { status: 409 }
      );
    }
    // Fungsi belum ada (migrasi 0035 belum dijalankan): jangan diam-diam
    // lolos tanpa pengaman, beri tahu supaya migrasi dijalankan.
    if (dupError) {
      console.error("find_duplicate_disbursement_proof gagal", dupError.message);
      return NextResponse.json(
        { error: "Pemeriksaan bukti pencairan gagal. Hubungi administrator (migrasi 0035)." },
        { status: 500 }
      );
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
    return NextResponse.json({ ok: true, fileId, viewUrl, proofSha256, proofPhash });
  } catch (err) {
    console.error("Drive upload failed", err);
    return NextResponse.json(
      { error: "Gagal mengunggah foto ke shared drive." },
      { status: 500 }
    );
  }
}
