import Bar from "@/components/skeletons/Bar";

export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-5 w-5 bg-slate-200 rounded" />

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2 flex-1">
            <Bar className="h-4 w-2/3" />
            <Bar className="h-3 w-1/3" />
          </div>
          <div className="h-5 w-16 bg-slate-200 rounded-full shrink-0" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Bar className="h-3 w-12" />
              <Bar className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>

      <div className="h-12 bg-white border border-slate-200 rounded-xl" />

      <div>
        <Bar className="h-4 w-24 mb-2" />
        <div className="space-y-2">
          <div className="h-14 bg-white rounded-xl border border-slate-200" />
          <div className="h-14 bg-white rounded-xl border border-slate-200" />
        </div>
      </div>
    </div>
  );
}
