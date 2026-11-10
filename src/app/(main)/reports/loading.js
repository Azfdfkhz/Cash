import Bar from "@/components/skeletons/Bar";

// Skeleton halaman Laporan — mengikuti layout ReportsTable persis:
//   Mobile   : search → filter tanggal → tab jenis → ringkasan → daftar kartu
//   Desktop  : kolom kiri (sama dengan mobile) + kolom kanan (panel pratinjau kwitansi)
// Grid desktop: lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] gap-6

function ReceiptCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      {/* Tanggal */}
      <Bar className="h-3 w-20 !bg-slate-100" />
      {/* Baris vendor + nominal */}
      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* Ikon vendor */}
          <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100" />
          <div className="min-w-0 space-y-2">
            <Bar className="h-3.5 w-32" />
            <Bar className="h-3 w-44 !bg-slate-100" />
            <Bar className="h-3 w-28 !bg-slate-100" />
          </div>
        </div>
        {/* Nominal */}
        <Bar className="h-4 w-20 shrink-0" />
      </div>
      {/* Baris requester + tombol */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <Bar className="h-3 w-24 !bg-slate-100" />
        <div className="h-9 w-28 rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}

function PreviewPanelSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      {/* Header panel */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div className="space-y-2">
          <Bar className="h-2.5 w-24 !bg-slate-100" />
          <Bar className="h-4 w-40" />
        </div>
        <div className="h-8 w-8 rounded-full bg-slate-100" />
      </div>
      {/* Meta (nama vendor · Drive) */}
      <div className="flex items-center justify-between px-5 py-3">
        <Bar className="h-3 w-32 !bg-slate-100" />
        <Bar className="h-3 w-28 !bg-slate-100" />
      </div>
      {/* Area pratinjau iframe */}
      <div className="bg-slate-50 px-5 pb-5">
        <div className="h-[28rem] rounded-xl bg-slate-200" />
      </div>
      {/* Footer tombol */}
      <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
        <div className="h-8 w-24 rounded-lg bg-slate-100" />
        <div className="h-8 w-20 rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Judul halaman */}
      <div className="mb-4 space-y-1.5">
        <Bar className="h-6 w-20" />
        <Bar className="h-3.5 w-64 !bg-slate-100" />
      </div>

      {/* Grid: kiri (filter + daftar) | kanan (pratinjau, desktop saja) */}
      <div className="space-y-3 lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
        {/* ── Kolom kiri ── */}
        <div className="space-y-3">
          {/* Filter area */}
          <div className="space-y-3">
            {/* Search bar */}
            <div className="h-11 rounded-xl border border-slate-200 bg-white" />

            {/* Filter tanggal */}
            <div className="h-11 rounded-xl border border-slate-200 bg-white" />

            {/* Tab jenis: Cash Advance | Reimbursement */}
            <div className="flex border-b border-slate-200">
              {["Cash Advance", "Reimbursement"].map((_, i) => (
                <div
                  key={i}
                  className="flex flex-1 items-center justify-center py-2.5"
                >
                  <Bar className={`h-3.5 w-24 ${i === 0 ? "" : "!bg-slate-100"}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Ringkasan total kwitansi + tombol CSV */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <Bar className="h-3.5 w-20 !bg-slate-100" />
            <div className="flex items-center gap-3">
              <Bar className="h-4 w-28" />
              <div className="h-7 w-14 rounded-lg bg-slate-200" />
            </div>
          </div>

          {/* Daftar kartu kwitansi */}
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <ReceiptCardSkeleton key={i} />
            ))}
          </div>
        </div>

        {/* ── Kolom kanan: panel pratinjau (desktop saja) ── */}
        <div className="hidden lg:block lg:sticky lg:top-8">
          <PreviewPanelSkeleton />
        </div>
      </div>
    </div>
  );
}
