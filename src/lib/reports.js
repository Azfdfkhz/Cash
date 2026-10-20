import { KIND_LABEL } from "@/lib/utils";

// Baca filter Laporan dari searchParams (?q=&tanggal=&jenis=).
export function getReportFilters(searchParams) {
  const q = String(searchParams?.q ?? "").trim().slice(0, 100);
  const rawDate = String(searchParams?.tanggal ?? "");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : "";
  const jenis = searchParams?.jenis;
  const kind = jenis === "cash_advance" || jenis === "reimbursement" ? jenis : "";
  return { q, date, kind };
}

// Panggil fungsi report_receipts() (satu halaman) dan ubah ke bentuk baris UI.
export async function fetchReportPage(supabase, { q, date, kind }, { limit, offset }) {
  const { data, error } = await supabase.rpc("report_receipts", {
    p_query: q || null,
    p_date: date || null,
    p_kind: kind || null,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  const rows = (data ?? []).map((r) => ({
    id: r.id,
    receiptDate: r.receipt_date,
    requesterName: r.requester_name ?? "-",
    purpose: r.purpose ?? "-",
    kind: KIND_LABEL[r.kind] ?? "Cash Advance",
    category: r.category ?? "",
    vendor: r.vendor,
    amount: r.amount,
    notes: r.notes,
    driveUrl: r.drive_view_url,
  }));
  return {
    rows,
    total: Number(data?.[0]?.total_count ?? 0),
    totalAmount: Number(data?.[0]?.total_amount ?? 0),
  };
}
