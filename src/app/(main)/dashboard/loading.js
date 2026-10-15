import Bar from "@/components/skeletons/Bar";

// Skeleton mengikuti bentuk Beranda baru (kartu saldo + daftar di mobile,
// kartu ringkasan + tabel di desktop).
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="lg:hidden space-y-5">
        <div className="space-y-2 pt-2">
          <Bar className="h-3 w-24" />
          <Bar className="h-7 w-44" />
        </div>
        <div className="h-44 rounded-[28px] border border-slate-200 bg-white" />
        <div className="h-14 rounded-2xl bg-slate-200" />
        <Bar className="h-5 w-40" />
        <div className="space-y-3.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[88px] rounded-2xl border border-slate-200 bg-white" />
          ))}
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="space-y-3">
          <Bar className="h-5 w-40" />
          <Bar className="h-9 w-72" />
        </div>
        <div className="mt-8 grid grid-cols-4 gap-5">
          <div className="h-36 rounded-3xl bg-slate-300" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 rounded-3xl border border-slate-200 bg-white" />
          ))}
        </div>
        <div className="mt-5 h-72 rounded-3xl border border-slate-200 bg-white" />
      </div>
    </div>
  );
}
