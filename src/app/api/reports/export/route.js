import { createClient, getUserProfile } from "@/lib/supabase/server";
import { fetchReportPage, getReportFilters } from "@/lib/reports";
import { MAX_FETCH_ROWS } from "@/lib/pagination";
import { formatDate, toCsvValue } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHUNK = 1000;

// Export CSV Laporan. Diambil bertahap hanya saat tombol CSV ditekan, sehingga
// halaman Laporan sendiri tidak perlu memuat seluruh kwitansi.
export async function GET(request) {
  const { profile } = await getUserProfile();
  if (profile?.role !== "operational") {
    return new Response("Forbidden", { status: 403 });
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const filters = getReportFilters(params);
  const supabase = await createClient();

  const all = [];
  try {
    for (let offset = 0; offset < MAX_FETCH_ROWS; offset += CHUNK) {
      const { rows } = await fetchReportPage(supabase, filters, { limit: CHUNK, offset });
      all.push(...rows);
      if (rows.length < CHUNK) break;
    }
  } catch (err) {
    console.error("Export laporan gagal", err);
    return new Response("Gagal mengekspor laporan.", { status: 500 });
  }

  const header = [
    "Tanggal Kwitansi",
    "Requester",
    "Jenis",
    "Keperluan",
    "Pos RAB / Kategori",
    "Vendor",
    "Nominal",
    "Catatan",
    "Link Foto",
  ];
  const lines = all.map((r) =>
    [
      r.receiptDate ? formatDate(r.receiptDate) : "-",
      r.requesterName,
      r.kind,
      r.purpose,
      r.category,
      r.vendor,
      r.amount,
      r.notes,
      r.driveUrl,
    ]
      .map(toCsvValue)
      .join(",")
  );

  const slug = filters.kind ? `${filters.kind.replace("_", "-")}-` : "";
  const filename = `laporan-kwitansi-${slug}${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(`﻿${[header.join(","), ...lines].join("\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
