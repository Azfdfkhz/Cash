import http from "node:http";
import { URL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { google } from "googleapis";

const credentialsPath = path.resolve(process.cwd(), "credentials.json");

if (!fs.existsSync(credentialsPath)) {
  console.error("credentials.json tidak ditemukan.");
  console.error("Letakkan OAuth Desktop App credentials dari Google Cloud Console di root project dengan nama credentials.json.");
  process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
const installed = credentials.installed || credentials.web;

if (!installed?.client_id || !installed?.client_secret) {
  console.error("credentials.json bukan OAuth client yang valid.");
  process.exit(1);
}

const port = Number(process.env.GOOGLE_OAUTH_LOCAL_PORT || 53682);
const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
const oauth2Client = new google.auth.OAuth2(
  installed.client_id,
  installed.client_secret,
  redirectUri
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/drive"],
});

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, redirectUri);

    if (url.pathname !== "/oauth2callback") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end(`Google OAuth gagal: ${error}`);
      server.close();
      process.exit(1);
    }

    if (!code) {
      res.writeHead(400);
      res.end("Authorization code tidak ditemukan.");
      return;
    }

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Refresh token tidak diberikan Google. Jalankan ulang dan pastikan prompt=consent digunakan.");
      server.close();
      process.exit(1);
    }

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h2>Berhasil</h2><p>Refresh token sudah didapat. Kamu bisa menutup tab ini dan kembali ke terminal.</p>");

    console.log("\n=== GOOGLE DRIVE OAUTH BERHASIL ===\n");
    console.log("Tambahkan ke .env.local (JANGAN commit ke GitHub):\n");
    console.log(`GOOGLE_DRIVE_OAUTH_CLIENT_ID=${installed.client_id}`);
    console.log(`GOOGLE_DRIVE_OAUTH_CLIENT_SECRET=${installed.client_secret}`);
    console.log(`GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("\nSetelah itu isi GOOGLE_DRIVE_FOLDER_ID dengan ID folder Drive tujuan.\n");

    server.close();
  } catch (err) {
    console.error("OAuth error:", err?.response?.data || err.message || err);
    res.writeHead(500);
    res.end("OAuth gagal. Periksa terminal untuk detail.");
    server.close();
    process.exit(1);
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log("Buka URL berikut di browser untuk memberikan izin Google Drive:\n");
  console.log(authUrl);
  console.log(`\nMenunggu callback di ${redirectUri} ...`);
});
