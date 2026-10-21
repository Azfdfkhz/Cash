import { createClient } from "@/lib/supabase/server";
import { loadDisplayFile } from "@/lib/google/displayImage";
import { downloadDriveFile } from "@/lib/google/drive";
import { checkRateLimit, detectFileType, tooManyRequests } from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 30;

// Ambil file bukti dari Drive lewat server (service account) supaya foto &
// PDF bisa ditampilkan langsung di aplikasi, tanpa bergantung pada penampil
// Google Drive (yang sering gagal di HP / minta login).
//
// Akses: file harus tercatat di salah satu tabel pengajuan yang BISA DIBACA
// user ini (RLS) -- kwitansi, pengembalian, penggantian, bukti pencairan,
// atau laporan. Jadi id file Drive sembarang tidak bisa diambil.
//
// `?download=1` (+ `&name=`): kirim berkas ASLI apa adanya dari Drive sebagai
// unduhan (bukan versi tampilan yang diperkecil), dengan pemeriksaan akses
// yang sama persis seperti pratinjau.

// Nama berkas aman untuk header: huruf/angka/spasi/titik/strip saja.
function safeFilename(raw, fallback) {
  const base = String(raw ?? "")
    .normalize("NFKD")
    .replace(/[^\w .-]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return base || fallback;
}

export async function GET(request, { params }) {
  const { fileId } = await params;
  if (!/^[a-zA-Z0-9_-]{10,}$/.test(fileId)) {
    return new Response("Bad request", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  // Longgar (foto cukup banyak per pengajuan, dan browser meng-cache 1 jam),
  // tapi menahan skrip yang menghujani server & kuota Drive.
  if (!(await checkRateLimit(supabase, "file_view", { max: 300, windowSeconds: 300 }))) {
    return tooManyRequests("Terlalu banyak permintaan file.", 60);
  }

  const checks = await Promise.all([
    supabase.from("receipts").select("id").eq("drive_file_id", fileId).limit(1),
    supabase.from("cash_advance_returns").select("id").eq("proof_drive_file_id", fileId).limit(1),
    supabase.from("cash_advance_reimbursements").select("id").eq("proof_drive_file_id", fileId).limit(1),
    supabase.from("cash_advances").select("id").eq("disbursement_proof_drive_file_id", fileId).limit(1),
    supabase.from("cash_advances").select("id").eq("report_drive_file_id", fileId).limit(1),
  ]);
  if (!checks.some(({ data }) => data?.length)) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("download") === "1") {
    try {
      const buffer = await downloadDriveFile(fileId);
      const type = detectFileType(buffer);
      const stem = safeFilename(url.searchParams.get("name"), `kwitansi-${fileId.slice(0, 8)}`)
        .replace(/\.[A-Za-z0-9]{2,5}$/, "");
      const filename = `${stem}.${type?.ext ?? "bin"}`;
      return new Response(buffer, {
        headers: {
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
          "Content-Type": type?.mime ?? "application/octet-stream",
          "Content-Length": String(buffer.length),
          "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
      });
    } catch (err) {
      console.error("File download failed", fileId, err);
      return new Response("Gagal mengunduh file.", { status: 502 });
    }
  }

  try {
    const file = await loadDisplayFile(fileId);
    return new Response(file.buffer, {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        "Content-Type": file.kind === "pdf" ? "application/pdf" : "image/jpeg",
      },
    });
  } catch (err) {
    console.error("File proxy failed", fileId, err);
    return new Response("Gagal memuat file.", { status: 502 });
  }
}
