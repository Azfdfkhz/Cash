import { PendingLink } from "@/components/PendingNav";

export function RoleBadge({ children, dot = false, dark = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border bg-white px-4 py-1 text-xs font-semibold tracking-wide ${
        dark ? "border-[#1e293b] text-[#1e293b]" : "border-slate-300 text-slate-600"
      }`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

// Kartu ringkasan desktop. `dark` = kartu utama bernuansa navy.
export function StatCard({ label, value, caption, icon: Icon, dark = false, dot = false, iconClass = "text-slate-600", valueClass = "text-3xl mt-5", tour }) {
  return (
    <div
      data-tour={tour}
      className={`rounded-2xl border p-5 xl:p-6 ${
        dark
          ? "border-slate-800 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-900"
      }`}
    >
      <div className="flex items-start justify-between">
        <p
          className={`text-xs uppercase tracking-[0.65px] ${
            dark ? "font-medium text-slate-300" : "font-semibold text-slate-600"
          }`}
        >
          {label}
        </p>
        {dot && <span className="h-2 w-2 rounded-full bg-white" />}
        {Icon && <Icon size={16} strokeWidth={1.75} className={iconClass} />}
      </div>
      <p className={`break-words font-bold tracking-tight ${valueClass}`}>{value}</p>
      <p className={`mt-2.5 text-xs leading-relaxed ${dark ? "text-slate-300" : "text-slate-600"}`}>
        {caption}
      </p>
    </div>
  );
}

// Tab "Semua | Belum Disetujui (n)" berbasis query ?filter=. Gaya garis bawah
// (sama dengan tab jenis pengajuan), tanpa wadah/kartu sendiri, supaya tidak
// menjadi kartu di dalam kartu.
export function FilterTabs({ filter, pendingCount, kind, size = "md" }) {
  const jenis = kind ? `jenis=${kind}` : "";
  const base =
    size === "sm"
      ? "whitespace-nowrap px-1 pb-2 pt-1 text-xs"
      : "whitespace-nowrap px-1 pb-2.5 pt-1 text-[13px]";
  const tab = (active) =>
    `${base} -mb-px border-b-2 font-semibold transition-colors ${
      active
        ? "border-brand text-brand"
        : "border-transparent text-slate-600 hover:text-slate-800"
    }`;
  return (
    <div data-tour="status-filter" role="tablist" className="inline-flex items-end gap-5 border-b border-slate-200">
      <PendingLink
        scroll={false}
        role="tab"
        aria-selected={filter !== "pending"}
        href={jenis ? `/dashboard?${jenis}` : "/dashboard"}
        className={tab(filter !== "pending")}
      >
        Semua
      </PendingLink>
      <PendingLink
        scroll={false}
        role="tab"
        aria-selected={filter === "pending"}
        href={`/dashboard?filter=pending${jenis ? `&${jenis}` : ""}`}
        className={tab(filter === "pending")}
      >
        Belum Disetujui ({pendingCount})
      </PendingLink>
    </div>
  );
}

// Sel tabel desktop: header & body
export const TH =
  "whitespace-nowrap px-6 py-4 text-xs font-semibold uppercase tracking-[0.55px] text-slate-600";
