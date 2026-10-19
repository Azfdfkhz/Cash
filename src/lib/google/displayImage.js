import sharp from "sharp";
import { downloadDriveFile, downloadDriveThumbnail } from "./drive";

// Ambil file bukti dari Drive dalam bentuk siap tampil:
//   { kind: "pdf", buffer }  -> PDF apa adanya
//   { kind: "image", buffer } -> JPEG (diputar sesuai EXIF, diperkecil)
// Foto yang tidak bisa dibaca sharp (HEIC iPhone, dll.) diambil dari
// render JPEG Google Drive.
export async function loadDisplayFile(fileId, { maxSize = 2000, quality = 82 } = {}) {
  const buffer = await downloadDriveFile(fileId);
  if (buffer.subarray(0, 4).toString() === "%PDF") return { kind: "pdf", buffer };

  const toJpeg = (input) =>
    sharp(input)
      .rotate()
      .resize({ width: maxSize, height: maxSize, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();

  try {
    return { kind: "image", buffer: await toJpeg(buffer) };
  } catch (err) {
    console.warn("sharp gagal membaca file, pakai render Drive", fileId, err.message);
    return { kind: "image", buffer: await toJpeg(await downloadDriveThumbnail(fileId, maxSize)) };
  }
}
