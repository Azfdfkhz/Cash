import Bar from "@/components/skeletons/Bar";

// Mengikuti Beranda (Operasional & Requester): mobile = sapaan, kartu saldo,
// aksi, daftar kartu; desktop (≥lg) = sapaan, 4 kartu statistik, tabel.
function MobileCard() {
  return (
    <div className="rounded-[22px] border border-slate-200/90 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Bar className="h-2.5 w-20 !bg-slate-100" />
          <Bar className="h-4 w-36" />
          <Bar className="h-3 w-28 !bg-slate-100" />
        </div>
        <div className="h-5 w-16 rounded-full bg-slate-200" />
      </div>
      <div className="mt-3 flex items-end justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
        <Bar className="h-3.5 w-2/3" />
        <Bar className="h-4 w-16" />
      </div>
      <div className="mt-3 h-10 rounded-xl bg-slate-100" />
    </div>
  );
}

function TableRow() {
  return (
    <div className="grid grid-cols-[1.2fr_2fr_1fr_1fr_1fr_1fr] items-center gap-4 border-b border-slate-100 px-5 py-4">
      <Bar className="h-3.5 w-28" />
      <Bar className="h-3.5 w-48 !bg-slate-100" />
      <Bar className="h-3.5 w-24 !bg-slate-100" />
      <Bar className="ml-auto h-3.5 w-16" />
      <div className="mx-auto h-5 w-16 rounded-full bg-slate-200" />
      <div className="mx-auto h-8 w-24 rounded-lg bg-slate-100" />
    </div>
  );
}

export default function Loading() {
  return (
    <div className="animate-pulse">
      {/* Mobile */}
      <div className="space-y-5 lg:hidden">
        <div className="flex items-end justify-between pt-2">
          <div className="space-y-2">
            <Bar className="h-3.5 w-24 !bg-slate-100" />
            <Bar className="h-7 w-44" />
          </div>
          <div className="h-6 w-24 rounded-full bg-slate-200" />
        </div>
        <div className="rounded-[28px] border border-slate-200/90 bg-white px-6 pb-6 pt-6">
          <Bar className="h-3.5 w-32 !bg-slate-100" />
          <Bar className="mb-4 mt-3 h-8 w-48" />
          <div className="flex gap-4 border-t border-slate-100 pt-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex-1 space-y-2">
                <Bar className="h-6 w-10" />
                <Bar className="h-2.5 w-full !bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
        <div className="h-14 rounded-2xl bg-slate-200" />
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Bar className="h-5 w-40" />
            <div className="h-7 w-32 rounded-full bg-slate-100" />
          </div>
          <MobileCard />
          <MobileCard />
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden lg:block">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Bar className="h-5 w-32 !bg-slate-100" />
            <Bar className="h-8 w-60" />
          </div>
          <div className="flex gap-3 pt-3">
            <div className="h-7 w-28 rounded-full bg-slate-200" />
            <div className="h-7 w-44 rounded-full border border-slate-200 bg-white" />
          </div>
        </div>
        <div className="mt-8 grid grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`rounded-3xl border p-5 ${
                i === 0 ? "border-slate-300 bg-slate-200" : "border-slate-200 bg-white"
              }`}
            >
              <Bar className={`h-3 w-24 ${i === 0 ? "!bg-slate-300" : ""}`} />
              <Bar className={`mt-6 h-8 w-20 ${i === 0 ? "!bg-slate-300" : ""}`} />
              <Bar className={`mt-3 h-2.5 w-36 ${i === 0 ? "!bg-slate-300" : "!bg-slate-100"}`} />
            </div>
          ))}
        </div>
        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between px-5 py-5">
            <div className="space-y-2">
              <Bar className="h-4 w-40" />
              <Bar className="h-3 w-72 !bg-slate-100" />
            </div>
            <div className="h-8 w-44 rounded-full bg-slate-100" />
          </div>
          <div className="flex gap-2 px-5 pb-4">
            <div className="h-8 w-20 rounded-full bg-slate-200" />
            <div className="h-8 w-28 rounded-full bg-slate-100" />
            <div className="h-8 w-28 rounded-full bg-slate-100" />
          </div>
          <div className="grid grid-cols-[1.2fr_2fr_1fr_1fr_1fr_1fr] gap-4 border-y border-slate-200 bg-slate-50/60 px-5 py-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Bar key={i} className="h-2.5 w-16 !bg-slate-200" />
            ))}
          </div>
          <TableRow />
          <TableRow />
          <TableRow />
          <TableRow />
        </div>
      </div>
    </div>
  );
}
