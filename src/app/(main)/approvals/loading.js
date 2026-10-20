import Bar from "@/components/skeletons/Bar";
import CashAdvanceCardSkeleton from "@/components/skeletons/CashAdvanceCardSkeleton";

// Mengikuti ApprovalsWorkspace: mobile = judul + filter + kartu;
// desktop (≥lg) = daftar 22rem di kiri + panel detail (tab) & aksi di kanan.
function Pills() {
  return (
    <div className="flex gap-2">
      <div className="h-8 w-20 rounded-full bg-slate-200" />
      <div className="h-8 w-28 rounded-full bg-slate-100" />
      <div className="h-8 w-28 rounded-full bg-slate-100" />
    </div>
  );
}

function ListCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <Bar className="h-4 w-2/3" />
      <Bar className="mt-2 h-2.5 w-20 !bg-slate-100" />
      <Bar className="mt-2 h-3 w-4/5 !bg-slate-100" />
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <Bar className="h-3 w-24 !bg-slate-100" />
        <div className="h-5 w-16 rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
      <section className="space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <Bar className="h-6 w-36" />
            <div className="hidden h-6 w-6 rounded-full bg-orange-100 lg:block" />
          </div>
          <Bar className="mt-2 h-3 w-56 !bg-slate-100" />
        </div>
        <Pills />
        <div className="space-y-3 lg:hidden">
          <CashAdvanceCardSkeleton />
          <CashAdvanceCardSkeleton />
          <CashAdvanceCardSkeleton />
        </div>
        <div className="hidden space-y-3 lg:block">
          <ListCardSkeleton />
          <ListCardSkeleton />
          <ListCardSkeleton />
        </div>
      </section>

      <aside className="hidden lg:block">
        <div className="flex h-[calc(100vh-4.5rem)] min-h-[32rem] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="flex items-start justify-between gap-3 px-6 pb-3 pt-5">
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5">
                <Bar className="h-5 w-16" />
                <Bar className="h-3 w-24 !bg-slate-100" />
                <div className="h-5 w-20 rounded-full bg-slate-200" />
              </div>
              <Bar className="h-5 w-72" />
              <Bar className="h-3 w-52 !bg-slate-100" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-9 rounded-lg border border-slate-200" />
              <div className="h-9 w-9 rounded-lg border border-slate-200" />
            </div>
          </div>
          <div className="flex gap-5 border-b border-slate-200 px-6 py-3">
            <Bar className="h-4 w-16" />
            <Bar className="h-4 w-10 !bg-slate-100" />
            <Bar className="h-4 w-16 !bg-slate-100" />
            <Bar className="h-4 w-14 !bg-slate-100" />
          </div>
          <div className="min-h-0 flex-1 space-y-5 px-6 py-5">
            <div className="rounded-2xl bg-slate-50 p-4">
              <Bar className="h-3 w-24 !bg-slate-100" />
              <Bar className="mt-2 h-7 w-44" />
            </div>
            <div className="grid grid-cols-3 gap-x-5 gap-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Bar className="h-2.5 w-20 !bg-slate-100" />
                  <Bar className="h-3.5 w-28" />
                </div>
              ))}
            </div>
          </div>
          <div className="shrink-0 space-y-3 border-t border-slate-200 px-6 py-4">
            <Bar className="h-3 w-48 !bg-slate-100" />
            <div className="h-16 rounded-xl border border-slate-200 bg-slate-50" />
            <div className="flex justify-end gap-3">
              <div className="h-10 w-24 rounded-full bg-slate-100" />
              <div className="h-10 w-44 rounded-full bg-slate-200" />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
