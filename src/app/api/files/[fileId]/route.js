import { createClient } from "@/lib/supabase/server";
import { loadDisplayFile } from "@/lib/google/displayImage";

export const runtime = "nodejs";
export const maxDuration = 30;

// Ambil file bukti dari Drive lewat server (service account) supaya foto &
// PDF bisa ditampilkan langsung di aplikasi, tanpa bergantung pada penampil
// Google Drive (yang sering gagal di HP / minta login).
//
// Akses: file harus tercatat di salah satu tabel pengajuan yang BISA DIBACA
// user ini (RLS) -- kwitansi, pengembalian, penggantian, bukti pencairan,
// atau laporan. Jadi id file Drive sembarang tidak bisa diambil.
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
