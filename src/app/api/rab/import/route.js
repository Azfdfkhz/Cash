import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { getGoogleAuth } from "@/lib/google/auth";
import { parseRabCsv, parseSheetUrl } from "@/lib/rab";

export const runtime = "nodejs";

// Spreadsheet dengan akses "siapa saja yang memiliki link" bisa diekspor
// langsung sebagai CSV per tab (gid).
async function fetchPublicCsv({ spreadsheetId, gid }) {
  const res = await fetch(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`,
    { redirect: "follow", cache: "no-store" }
  );
  if (!res.ok || !res.headers.get("content-type")?.includes("text/csv")) {
    return null;
  }
  return res.text();
}

// Spreadsheet privat yang di-share ke service account. Ekspor Drive hanya
// mengambil tab pertama.
async function fetchViaServiceAccount({ spreadsheetId }) {
  const drive = google.drive({ version: "v3", auth: getGoogleAuth() });
  const res = await drive.files.export(
    { fileId: spreadsheetId, mimeType: "text/csv" },
    { responseType: "text" }
  );
  return res.data;
}

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await request.json();
  const sheet = parseSheetUrl(url);
  if (!sheet) {
    return NextResponse.json(
      { error: "Link Google Spreadsheet tidak valid." },
      { status: 400 }
    );
  }

  let csv = null;
  try {
    csv = await fetchPublicCsv(sheet);
    if (csv == null) csv = await fetchViaServiceAccount(sheet);
  } catch (err) {
    console.error("RAB spreadsheet fetch failed", err);
  }

  if (csv == null) {
    const sa = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    return NextResponse.json(
      {
        error: `Spreadsheet tidak bisa dibuka. Ubah akses jadi "Siapa saja yang memiliki link", atau share ke ${sa || "service account aplikasi"}.`,
      },
      { status: 400 }
    );
  }

  try {
    return NextResponse.json({ ok: true, ...parseRabCsv(csv) });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 422 });
  }
}
