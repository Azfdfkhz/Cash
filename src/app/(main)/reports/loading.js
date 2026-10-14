import Bar from "@/components/skeletons/Bar";

export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-2">
        <Bar className="h-5 w-24" />
        <Bar className="h-3 w-56" />
      </div>

      <div className="flex gap-2">
        <div className="flex-1 h-10 bg-white border border-slate-200 rounded-lg" />
        <div className="h-10 w-20 bg-slate-200 rounded-lg shrink-0" />
      </div>

      <div className="h-12 bg-white rounded-xl border border-slate-200" />

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="h-9 bg-slate-50 border-b border-slate-200" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-11 flex items-center gap-4 px-3 border-b border-slate-100 last:border-0"
          >
            <Bar className="h-3 w-14" />
            <Bar className="h-3 w-20" />
            <Bar className="h-3 flex-1" />
            <Bar className="h-3 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}
