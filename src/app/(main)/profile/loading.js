import Bar from "@/components/skeletons/Bar";

export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-2">
        <Bar className="h-5 w-20" />
        <Bar className="h-3 w-48" />
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Bar className="h-3 w-24" />
            <div className="h-10 bg-slate-100 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
