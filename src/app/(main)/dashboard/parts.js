import Link from "next/link";

export function RoleBadge({ children, dot = false, dark = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border bg-white px-4 py-1 text-xs font-semibold tracking-wide ${
        dark ? "border-[#1e293b] text-[#1e293b]" : "border-slate-200 text-slate-700"
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
      className={`rounded-3xl border p-6 ${
        dark
          ? "border-[#0f172a] bg-[#0f172a] text-white"
          : "border-slate-200 bg-white text-slate-900"
      }`}
    >
      <div className="flex items-start justify-between">
        <p
          className={`text-[11px] font-semibold uppercase tracking-wider ${
            dark ? "text-slate-300" : "text-slate-600"
          }`}
        >
          {label}
        </p>
        {dot && <span className="h-2 w-2 rounded-full bg-white" />}
        {Icon && <Icon size={16} strokeWidth={1.75} className={iconClass} />}
      </div>
      <p className={`font-extrabold tracking-tight ${valueClass}`}>{value}</p>
      <p className={`mt-3 text-xs ${dark ? "text-slate-300" : "text-slate-500"}`}>
        {caption}
      </p>
    </div>
  );
}

// Toggle "Semua | Menunggu (n)" berbasis query ?filter=
export function FilterTabs({ filter, pendingCount, kind, size = "md" }) {
  const jenis = kind ? `jenis=${kind}` : "";
  const base =
    size === "sm"
      ? "whitespace-nowrap px-3 py-1.5 text-xs"
      : "px-5 py-2 text-[13px]";
  const tab = (active) =>
    `${base} rounded-full font-semibold transition-colors ${
      active
        ? "bg-white text-slate-900 shadow-[0_1px_3px_rgba(15,23,42,0.12)]"
        : "text-slate-500 hover:text-slate-700"
    }`;
  return (
    <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
      <Link href={jenis ? `/dashboard?${jenis}` : "/dashboard"} className={tab(filter !== "pending")}>
        Semua
      </Link>
      <Link
        href={`/dashboard?filter=pending${jenis ? `&${jenis}` : ""}`}
        className={tab(filter === "pending")}
      >
        Menunggu ({pendingCount})
      </Link>
    </div>
  );
}

// Sel tabel desktop: header & body
export const TH =
  "whitespace-nowrap px-5 py-3 text-[10.5px] font-semibold uppercase tracking-wider text-slate-500";
