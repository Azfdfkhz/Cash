// Ubah foto yang dipilih user jadi JPEG SEBELUM dipratinjau & diunggah:
// - HEIC/HEIF (kamera iPhone): dibaca langsung oleh browser kalau bisa
//   (Safari iPhone/Mac -- cepat). Kalau browser tidak bisa (Chrome/Android),
//   pakai heic-to (WASM, dimuat hanya kalau perlu) -- lambat, foto 12MP bisa
//   ~30-60 detik, jadi `onSlowConversion` dipanggil supaya UI bisa memberi
//   tahu user.
// - Semua foto diputar sesuai EXIF & diperkecil (maks. `maxSize` px) supaya
//   unggahan ringan.
// PDF dan file non-gambar dikembalikan apa adanya. Kalau konversi gagal,
// file asli yang dipakai (server masih punya cadangan lewat render Drive).

const HEIC_RE = /\.(heic|heif)$/i;

function isHeicFile(file) {
  return /image\/hei[cf]/i.test(file.type) || HEIC_RE.test(file.name);
}

function jpegName(name) {
  return `${name.replace(/\.[^.]+$/, "") || "foto"}.jpg`;
}

async function resizeToJpeg(blob, maxSize, quality) {
  const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff"; // PNG transparan -> latar putih, bukan hitam
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob gagal"))), "image/jpeg", quality)
    );
  } finally {
    bitmap.close?.();
  }
}

export async function toJpegFile(
  file,
  { maxSize = 2000, quality = 0.85, onSlowConversion } = {}
) {
  if (!file || file.type === "application/pdf") return file;
  const heic = isHeicFile(file);
  if (!heic && !file.type.startsWith("image/")) return file;

  let source = file;
  try {
    let jpeg;
    try {
      // Jalur cepat: browser membaca file langsung (termasuk HEIC di Safari).
      jpeg = await resizeToJpeg(file, maxSize, quality);
    } catch (nativeErr) {
      if (!heic) throw nativeErr;
      onSlowConversion?.();
      const { heicTo } = await import("heic-to");
      source = await heicTo({ blob: file, type: "image/jpeg", quality });
      jpeg = await resizeToJpeg(source, maxSize, quality);
    }
    return new File([jpeg], jpegName(file.name), { type: "image/jpeg" });
  } catch (err) {
    console.error("Konversi ke JPEG gagal, pakai file asli", file.name, err);
    // HEIC yang sudah berhasil dikonversi tapi gagal diperkecil tetap
    // lebih baik dipakai daripada HEIC aslinya.
    return source !== file
      ? new File([source], jpegName(file.name), { type: "image/jpeg" })
      : file;
  }
}
