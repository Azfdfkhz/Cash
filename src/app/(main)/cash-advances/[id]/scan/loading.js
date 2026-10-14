import Bar from "@/components/skeletons/Bar";

export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <Bar className="h-5 w-40" />
      <div className="h-64 bg-white border-2 border-dashed border-slate-200 rounded-2xl" />
      <div className="h-10 bg-slate-200 rounded-lg" />
    </div>
  );
}
