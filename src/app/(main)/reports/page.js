import { redirect } from "next/navigation";
import { createClient, getUserProfile } from "@/lib/supabase/server";
import { getPage, pageRange, PAGE_SIZE } from "@/lib/pagination";
import { fetchReportPage, getReportFilters } from "@/lib/reports";
import ReportsTable from "@/components/ReportsTable";
import Pagination from "@/components/Pagination";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }) {
  const { profile } = await getUserProfile();
  if (profile?.role !== "operational") redirect("/dashboard");

  const params = await searchParams;
  const filters = getReportFilters(params);
  let page = getPage(params);
  const supabase = await createClient();

  // Hanya PAGE_SIZE kwitansi yang diambil per halaman -- pencarian, filter,
  // urutan, dan total dihitung di database (fungsi report_receipts), bukan
  // dengan memuat semua kwitansi ke browser.
  let { from } = pageRange(page);
  let result = await fetchReportPage(supabase, filters, { limit: PAGE_SIZE, offset: from });
  // Halaman di luar jangkauan (mis. filter baru mempersempit hasil): mundur ke 1.
  if (result.rows.length === 0 && page > 1) {
    page = 1;
    from = 0;
    result = await fetchReportPage(supabase, filters, { limit: PAGE_SIZE, offset: 0 });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 lg:text-2xl lg:font-bold">Laporan</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Rekap seluruh kwitansi Cash Advance dan Reimbursement.
        </p>
      </div>
      <ReportsTable
        rows={result.rows}
        total={result.total}
        totalAmount={result.totalAmount}
        filters={filters}
        pagination={
          <Pagination
            page={page}
            total={result.total}
            pageSize={PAGE_SIZE}
            basePath="/reports"
            params={{
              q: filters.q,
              tanggal: filters.date,
              jenis: filters.kind,
            }}
          />
        }
      />
    </div>
  );
}
