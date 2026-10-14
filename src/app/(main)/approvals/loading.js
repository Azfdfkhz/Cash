import Bar from "@/components/skeletons/Bar";
import CashAdvanceCardSkeleton from "@/components/skeletons/CashAdvanceCardSkeleton";

export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-2">
        <Bar className="h-5 w-32" />
        <Bar className="h-3 w-52" />
      </div>
      <div className="space-y-3">
        <CashAdvanceCardSkeleton />
        <CashAdvanceCardSkeleton />
        <CashAdvanceCardSkeleton />
      </div>
    </div>
  );
}
