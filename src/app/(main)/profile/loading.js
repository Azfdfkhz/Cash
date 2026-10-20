import Bar from "@/components/skeletons/Bar";

// Mengikuti halaman Profil baru: mobile = header avatar di tengah; desktop =
// kartu ringkasan 17rem di kiri. Kolom kanan (baris isian + Telegram + Lainnya)
// dipakai bersama.
function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-t border-slate-100 px-4 py-3.5 first:border-t-0">
      <div className="h-11 w-11 shrink-0 rounded-xl border border-slate-100 bg-slate-50" />
      <div className="flex-1 space-y-2">
        <Bar className="h-2.5 w-24 !bg-slate-100" />
        <Bar className="h-4 w-44" />
      </div>
    </div>
  );
}

function SectionSkeleton({ rows, labelWidth = "w-28" }) {
  return (
    <section>
      <Bar className={`mb-2 ml-1 h-2.5 ${labelWidth} !bg-slate-100`} />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {Array.from({ length: rows }).map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export default function Loading() {
  return (
    <div className="animate-pulse space-y-4 lg:space-y-6">
      <Bar className="hidden h-7 w-24 lg:block" />

      {/* Mobile: header profil */}
      <div className="lg:hidden">
        <Bar className="mt-3 h-7 w-24" />
        <div className="mt-6 flex flex-col items-center">
          <div className="h-[84px] w-[84px] rounded-full bg-slate-200" />
          <Bar className="mt-4 h-5 w-40" />
          <Bar className="mt-2 h-3.5 w-52 !bg-slate-100" />
          <div className="mt-3 h-6 w-24 rounded-full bg-slate-200" />
        </div>
      </div>

      <div className="space-y-6 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
        {/* Desktop: kartu ringkasan */}
        <div className="hidden rounded-3xl border border-slate-200 bg-white p-6 lg:block">
          <div className="mx-auto h-24 w-24 rounded-full bg-slate-200" />
          <Bar className="mx-auto mt-5 h-5 w-36" />
          <Bar className="mx-auto mt-2 h-3 w-44 !bg-slate-100" />
          <div className="mx-auto mt-3 h-6 w-24 rounded-full bg-slate-200" />
          <div className="mt-6 border-t border-slate-100 pt-6">
            <div className="h-10 rounded-xl border border-slate-200" />
          </div>
        </div>

        <div className="space-y-6">
          <SectionSkeleton rows={5} />
          <SectionSkeleton rows={1} labelWidth="w-20" />
          <SectionSkeleton rows={3} labelWidth="w-16" />
          <div className="h-12 rounded-2xl border border-slate-200 bg-white lg:hidden" />
        </div>
      </div>
    </div>
  );
}
