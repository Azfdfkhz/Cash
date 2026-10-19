import Bar from "@/components/skeletons/Bar";
import CashAdvanceCardSkeleton from "@/components/skeletons/CashAdvanceCardSkeleton";

export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
          <Bar className="h-3 w-24" />
          <Bar className="h-7 w-12" />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
          <Bar className="h-3 w-28" />
          <Bar className="h-6 w-20" />
        </div>
      </div>

      <div className="h-12 bg-white border border-dashed border-slate-200 rounded-xl" />

      <div>
        <Bar className="h-4 w-32 mb-2" />
        <div className="space-y-3">
          <CashAdvanceCardSkeleton />
          <CashAdvanceCardSkeleton />
          <CashAdvanceCardSkeleton />
        </div>
      </div>
    </div>
  );
}
