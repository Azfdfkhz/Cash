import Bar from "@/components/skeletons/Bar";

export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-2">
        <Bar className="h-5 w-40" />
        <Bar className="h-3 w-56" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3"
          >
            <div className="space-y-1.5 flex-1">
              <Bar className="h-4 w-1/3" />
              <Bar className="h-3 w-1/2" />
            </div>
            <Bar className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
