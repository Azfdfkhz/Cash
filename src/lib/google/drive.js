import { google } from "googleapis";
import { Readable } from "stream";
import { getDriveAuth } from "./drive-auth";

// `legacyNames`: nama folder format lama yang tetap dipakai kalau sudah ada,
// supaya file pengajuan lama tidak terpecah ke folder baru saat format nama
// folder berubah. Folder baru selalu dibuat dengan `name`.
async function getOrCreateSubfolder(drive, parentFolderId, name, legacyNames = []) {
  const escape = (v) => v.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const nameFilter = [name, ...legacyNames]
    .map((n) => `name = '${escape(n)}'`)
    .join(" or ");
  const q = `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and (${nameFilter}) and trashed = false`;

  const existing = await drive.files.list({
    q,
    fields: "files(id)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (existing.data.files?.length) {
    return existing.data.files[0].id;
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  return created.data.id;
}

export async function uploadReceiptToDrive({
  buffer,
  filename,
  mimeType,
  folderName,
  legacyFolderNames,
}) {
  const auth = getDriveAuth();
  const drive = google.drive({ version: "v3", auth });

  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID is not configured.");
  }

  const targetFolderId = folderName
    ? await getOrCreateSubfolder(drive, rootFolderId, folderName, legacyFolderNames)
    : rootFolderId;

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [targetFolderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id, webViewLink, webContentLink",
    supportsAllDrives: true,
  });

  await drive.permissions.create({
    fileId: res.data.id,
    requestBody: { role: "reader", type: "anyone" },
    supportsAllDrives: true,
  });

  return {
    fileId: res.data.id,
    viewUrl: res.data.webViewLink,
  };
}

// Unduh isi file Drive (dipakai laporan PDF untuk menyertakan foto bukti).
export async function downloadDriveFile(fileId) {
  const auth = getDriveAuth();
  const drive = google.drive({ version: "v3", auth });
  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data);
}

// Gambar hasil render Google Drive (JPEG) untuk file foto. Dipakai kalau foto
// tidak bisa dibaca di server -- terutama HEIC dari iPhone, yang tidak
// didukung sharp versi prebuilt. Drive bisa merender HEIC.
export async function downloadDriveThumbnail(fileId, size = 2000) {
  const auth = getDriveAuth();
  const drive = google.drive({ version: "v3", auth });
  const { data } = await drive.files.get({
    fileId,
    fields: "thumbnailLink",
    supportsAllDrives: true,
  });
  if (!data.thumbnailLink) {
    throw new Error("Drive tidak punya pratinjau untuk file ini.");
  }
  const { token } = await auth.getAccessToken();
  const res = await fetch(data.thumbnailLink.replace(/=s\d+$/, `=s${size}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Gagal mengambil pratinjau Drive (${res.status}).`);
  return Buffer.from(await res.arrayBuffer());
}
