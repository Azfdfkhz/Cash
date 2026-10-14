import { google } from "googleapis";
import { Readable } from "stream";
import { getDriveAuth } from "./drive-auth";

async function getOrCreateSubfolder(drive, parentFolderId, name) {
  const safeName = name.replace(/'/g, "\\'");
  const q = `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${safeName}' and trashed = false`;

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
}) {
  const auth = getDriveAuth();
  const drive = google.drive({ version: "v3", auth });

  const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!rootFolderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID is not configured.");
  }

  const targetFolderId = folderName
    ? await getOrCreateSubfolder(drive, rootFolderId, folderName)
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
