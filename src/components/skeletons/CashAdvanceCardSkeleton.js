// Bentuk placeholder mengikuti <CashAdvanceCard> -- dipakai di loading.js
// Dashboard & Persetujuan supaya list-nya tidak "lompat" pas data asli masuk.
export default function CashAdvanceCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 bg-slate-200 rounded w-3/4" />
          <div className="h-3 bg-slate-100 rounded w-1/3" />
        </div>
        <div className="h-5 w-16 bg-slate-200 rounded-full shrink-0" />
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div className="space-y-1.5">
          <div className="h-3 bg-slate-100 rounded w-14" />
          <div className="h-4 bg-slate-200 rounded w-20" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 bg-slate-100 rounded w-14 ml-auto" />
          <div className="h-4 bg-slate-200 rounded w-20 ml-auto" />
        </div>
      </div>
    </div>
  );
}
