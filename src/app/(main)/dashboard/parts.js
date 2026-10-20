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
export function StatCard({ label, value, caption, icon: Icon, dark = false, dot = false, iconClass = "text-slate-400", valueClass = "text-3xl mt-5" }) {
  return (
    <div
      className={`rounded-2xl border p-5 xl:p-6 ${
        dark
          ? "border-slate-800 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-900"
      }`}
    >
      <div className="flex items-start justify-between">
        <p
          className={`text-[11px] uppercase tracking-[0.65px] ${
            dark ? "font-medium text-slate-300" : "font-semibold text-slate-500"
          }`}
        >
          {label}
        </p>
        {dot && <span className="h-2 w-2 rounded-full bg-white" />}
        {Icon && <Icon size={16} strokeWidth={1.75} className={iconClass} />}
      </div>
      <p className={`break-words font-bold tracking-tight ${valueClass}`}>{value}</p>
      <p className={`mt-2.5 text-xs leading-relaxed ${dark ? "text-slate-300" : "text-slate-500"}`}>
        {caption}
      </p>
    </div>
  );
}

// Toggle "Semua | Belum Disetujui (n)" berbasis query ?filter=
export function FilterTabs({ filter, pendingCount, kind, size = "md" }) {
  const jenis = kind ? `jenis=${kind}` : "";
  const base =
    size === "sm"
      ? "whitespace-nowrap px-3 py-1.5 text-xs"
      : "px-5 py-2 text-[13px]";
  const tab = (active) =>
    `${base} rounded-full font-semibold transition-colors ${
      active
        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
        : "text-slate-500 hover:text-slate-700"
    }`;
  return (
    <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100/80 p-1">
      <PendingLink scroll={false} href={jenis ? `/dashboard?${jenis}` : "/dashboard"} className={tab(filter !== "pending")}>
        Semua
      </PendingLink>
      <PendingLink
        scroll={false}
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
  "whitespace-nowrap px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.55px] text-slate-400";
