import { NextResponse } from "next/server";
import { google } from "googleapis";
import { createClient } from "@/lib/supabase/server";
import { getGoogleAuth } from "@/lib/google/auth";
import { parseRabCsv, parseSheetUrl } from "@/lib/rab";
import { checkRateLimit, fetchWithTimeout, tooManyRequests } from "@/lib/security";

const MAX_CSV_CHARS = 1_000_000;

export const runtime = "nodejs";

// Spreadsheet dengan akses "siapa saja yang memiliki link" bisa diekspor
// langsung sebagai CSV per tab (gid).
async function fetchPublicCsv({ spreadsheetId, gid }) {
  const res = await fetchWithTimeout(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`,
    { redirect: "follow", cache: "no-store" },
    10000
  );
  if (!res.ok || !res.headers.get("content-type")?.includes("text/csv")) {
    return null;
  }
  const text = await res.text();
  return text.length > MAX_CSV_CHARS ? text.slice(0, MAX_CSV_CHARS) : text;
}

// Spreadsheet privat yang di-share ke service account. Ekspor Drive hanya
// mengambil tab pertama.
async function fetchViaServiceAccount({ spreadsheetId }) {
  const drive = google.drive({ version: "v3", auth: getGoogleAuth() });
  const res = await drive.files.export(
    { fileId: spreadsheetId, mimeType: "text/csv" },
    { responseType: "text" }
  );
  return typeof res.data === "string" ? res.data.slice(0, MAX_CSV_CHARS) : res.data;
}

export async function POST(request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await checkRateLimit(supabase, "rab_import", { max: 20, windowSeconds: 600 }))) {
    return tooManyRequests("Terlalu sering mengimpor RAB. Coba lagi beberapa menit lagi.", 120);
  }

  const { url } = await request.json().catch(() => ({}));
  const sheet = parseSheetUrl(url);
  if (!sheet) {
    return NextResponse.json(
      { error: "Link tidak valid. Periksa kembali link RAB Anda." },
      { status: 400 }
    );
  }

  let csv = null;
  try {
    csv = await fetchPublicCsv(sheet);
    if (csv == null) csv = await fetchViaServiceAccount(sheet);
  } catch (err) {
    console.error("RAB import fetch failed", err);
  }

  if (csv == null) {
    // Jangan menyebut email service account / cara kerja impor ke pengguna.
    return NextResponse.json(
      {
        error: 'Link tidak bisa dibuka. Pastikan akses link diatur ke "Siapa saja yang memiliki link".',
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
