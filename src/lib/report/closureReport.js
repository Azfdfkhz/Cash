import { loadDisplayFile } from "@/lib/google/displayImage";
import { buildClosurePdf } from "@/lib/report/closurePdf";

export class ReportError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Ambil semua data pengajuan (lewat client Supabase milik user -> ikut RLS)
// lalu bangun PDF laporan penutupan. Hanya untuk pengajuan yang closed.
export async function generateClosureReport(supabase, id) {
  const [
    { data: ca },
    { data: items },
    { data: receipts },
    { data: returns },
    { data: reimbursements },
    { data: events },
  ] = await Promise.all([
    supabase
      .from("cash_advances")
      .select("*, profiles:requester_id(full_name), disburser:disbursed_by(full_name)")
      .eq("id", id)
      .single(),
    supabase.from("rab_items").select("*").eq("cash_advance_id", id).order("position"),
    supabase
      .from("receipts")
      .select("*, receipt_lines(*)")
      .eq("cash_advance_id", id)
      .order("receipt_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("cash_advance_returns")
      .select("*")
      .eq("cash_advance_id", id)
      .order("created_at"),
    supabase
      .from("cash_advance_reimbursements")
      .select("*")
      .eq("cash_advance_id", id)
      .order("created_at"),
    supabase
      .from("cash_advance_events")
      .select("*, profiles:actor_id(full_name)")
      .eq("cash_advance_id", id)
      .eq("action", "approved")
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  if (!ca) throw new ReportError("Pengajuan tidak ditemukan.", 404);
  if (ca.status !== "closed") {
    throw new ReportError("Laporan tersedia setelah pengajuan selesai.", 400);
  }

  // Pengajuan yang selesai sebelum kolom closed_at ada: pakai tanggal
  // aktivitas terakhir.
  const realizedAt =
    ca.closed_at ??
    [
      ...(receipts ?? []).map((r) => r.created_at),
      ...(returns ?? []).map((r) => r.confirmed_at),
      ...(reimbursements ?? []).map((r) => r.created_at),
    ]
      .filter(Boolean)
      .sort()
      .pop() ??
    new Date().toISOString();

  const bytes = await buildClosurePdf({
    ca,
    items: items ?? [],
    receipts: receipts ?? [],
    returns: returns ?? [],
    reimbursements: reimbursements ?? [],
    approvedEvent: events?.[0] ?? null,
    realizedAt,
    // Foto dinormalkan ke JPEG di sini (termasuk HEIC lewat render Drive).
    loadFile: async (id) =>
      (await loadDisplayFile(id, { maxSize: 1400, quality: 72 })).buffer,
  });

  return { ca, bytes, realizedAt };
}
