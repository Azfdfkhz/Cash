import Bar from "@/components/skeletons/Bar";

// Baris tabel desktop (Beranda). `cols` = jumlah kolom tabelnya.
export function TableBodySkeleton({ rows = 4, cols = 6 }) {
  return (
    <tbody aria-busy="true" className="animate-pulse">
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} className="border-b border-slate-100 last:border-0">
          {Array.from({ length: cols }, (_, c) => (
            <td key={c} className="px-5 py-4">
              <Bar className={`h-3.5 ${c === 1 ? "w-48" : c === cols - 1 ? "mx-auto h-8 w-20" : "w-24"}`} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// Daftar kartu kwitansi di halaman Laporan.
export function ReceiptListSkeleton({ rows = 4 }) {
  return (
    <div className="space-y-3 animate-pulse" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
          <Bar className="h-3 w-20 !bg-slate-100" />
          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-200" />
              <div className="space-y-2">
                <Bar className="h-3.5 w-32" />
                <Bar className="h-3 w-44 !bg-slate-100" />
              </div>
            </div>
            <Bar className="h-4 w-20" />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <Bar className="h-3 w-24 !bg-slate-100" />
            <div className="h-7 w-28 rounded-lg bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Panel detail di kanan halaman Persetujuan (desktop).
export function DetailPanelSkeleton() {
  return (
    <div
      aria-busy="true"
      className="flex h-[calc(100vh-4.5rem)] min-h-[32rem] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white animate-pulse"
    >
      <div className="space-y-2.5 px-6 pb-3 pt-5">
        <Bar className="h-5 w-40" />
        <Bar className="h-5 w-72" />
        <Bar className="h-3 w-52 !bg-slate-100" />
      </div>
      <div className="flex gap-5 border-b border-slate-200 px-6 py-3">
        <Bar className="h-4 w-16" />
        <Bar className="h-4 w-10 !bg-slate-100" />
        <Bar className="h-4 w-16 !bg-slate-100" />
      </div>
      <div className="space-y-5 px-6 py-5">
        <div className="rounded-2xl bg-slate-50 p-4">
          <Bar className="h-3 w-24 !bg-slate-100" />
          <Bar className="mt-2 h-7 w-44" />
        </div>
        <div className="grid grid-cols-3 gap-x-5 gap-y-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-1.5">
              <Bar className="h-2.5 w-20 !bg-slate-100" />
              <Bar className="h-3.5 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Isi tab di pop up detail pengajuan selagi rinciannya dimuat.
export function DetailTabSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-3 animate-pulse" aria-busy="true" aria-label="Memuat rincian">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <Bar className="h-4 w-40" />
            <Bar className="h-4 w-20" />
          </div>
          <Bar className="mt-2.5 h-3 w-2/3 !bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

// Angka Terpakai / Dikembalikan / Sisa Saldo selagi dimuat (menghindari
// angka sementara yang salah seperti "Terpakai 0%").
export function MoneyFlowSkeleton() {
  return (
    <div className="mt-4 animate-pulse" aria-busy="true">
      <div className="h-1.5 rounded-full bg-slate-200" />
      <div className="mt-3 grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-1.5">
            <Bar className="h-2.5 w-16 !bg-slate-100" />
            <Bar className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
