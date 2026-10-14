import { redirect } from "next/navigation";
import { createClient, getUserProfile } from "@/lib/supabase/server";
import { fetchAll, MAX_FETCH_ROWS } from "@/lib/pagination";
import ReportsTable from "@/components/ReportsTable";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const { profile } = await getUserProfile();
  if (profile?.role !== "operational") redirect("/dashboard");

  const supabase = await createClient();

  // Laporan butuh SEMUA kwitansi sekaligus (untuk pencarian, total, & export
  // CSV di sisi klien). Ambil per potongan agar menembus plafon 1000 baris
  // PostgREST, dibatasi MAX_FETCH_ROWS sebagai pengaman.
  // Hanya ambil kolom yang benar-benar dipakai ReportsTable — "*" sebelumnya
  // ikut menarik ocr_raw_text (blob teks OCR) untuk sampai 10.000 baris di
  // setiap kunjungan halaman ini, salah satu query paling berat di aplikasi.
  const receipts = await fetchAll(({ from, to }) =>
    supabase
      .from("receipts")
      .select(
        "id, receipt_date, vendor, amount, notes, drive_view_url, cash_advances:cash_advance_id(purpose, profiles:requester_id(full_name))"
      )
      .order("created_at", { ascending: false })
      .range(from, to)
  );

  const rows = receipts.map((r) => ({
    id: r.id,
    receiptDate: r.receipt_date,
    requesterName: r.cash_advances?.profiles?.full_name ?? "-",
    purpose: r.cash_advances?.purpose ?? "-",
    vendor: r.vendor,
    amount: r.amount,
    notes: r.notes,
    driveUrl: r.drive_view_url,
  }));

  const capped = rows.length >= MAX_FETCH_ROWS;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Laporan</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Rekap seluruh kwitansi realisasi Cash Advance.
        </p>
      </div>
      {capped && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Menampilkan {MAX_FETCH_ROWS.toLocaleString("id-ID")} kwitansi terbaru.
          Untuk rekap lebih lama, export CSV per periode secara berkala.
        </p>
      )}
      <ReportsTable rows={rows} />
    </div>
  );
}
