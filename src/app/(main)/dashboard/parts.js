"use client";

import { useEffect, useState } from "react";
import { PendingLink, usePendingNav } from "@/components/PendingNav";

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

// Tab "Semua | Belum Disetujui (n) | Perlu Konfirmasi (n)" berbasis query ?filter=. Gaya garis bawah
// (sama dengan tab jenis pengajuan), tanpa wadah/kartu sendiri, supaya tidak
// menjadi kartu di dalam kartu.
export function FilterTabs({ filter, pendingCount, confirmCount = 0, kind, size = "md", fill = false }) {
  const jenis = kind ? `jenis=${kind}` : "";
  // Tab aktif pindah seketika saat diklik, tanpa menunggu data baru dari server.
  // `optimistic` hanya dipakai selama navigasi berjalan, lalu kembali ke `filter`.
  const { pending } = usePendingNav();
  const [optimistic, setOptimistic] = useState(null);
  useEffect(() => {
    if (!pending) setOptimistic(null);
  }, [pending]);
  const serverKey = filter === "pending" || filter === "confirm" ? filter : "all";
  const current = pending && optimistic ? optimistic : serverKey;
  const base =
    size === "sm"
      ? "whitespace-nowrap px-1 pb-2 pt-1 text-xs"
      : "whitespace-nowrap px-1 pb-2.5 pt-1 text-[13px]";
  const tab = (active) =>
    `${base} ${fill ? "flex-1 text-center" : ""} -mb-px border-b-2 font-semibold transition-colors ${
      active
        ? "border-brand text-brand"
        : "border-transparent text-slate-600 hover:text-slate-800"
    }`;
  return (
    <div
      data-tour="status-filter"
      role="tablist"
      className={
        fill
          ? "flex w-full items-end justify-between gap-2 overflow-x-auto border-b border-slate-200"
          : "inline-flex items-end gap-5 border-b border-slate-200"
      }
    >
      <PendingLink
        scroll={false}
        role="tab"
        aria-selected={current === "all"}
        href={jenis ? `/dashboard?${jenis}` : "/dashboard"}
        onClick={() => setOptimistic("all")}
        className={tab(current === "all")}
      >
        Semua
      </PendingLink>
      <PendingLink
        scroll={false}
        role="tab"
        aria-selected={current === "pending"}
        href={`/dashboard?filter=pending${jenis ? `&${jenis}` : ""}`}
        onClick={() => setOptimistic("pending")}
        className={tab(current === "pending")}
      >
        Belum Disetujui ({pendingCount})
      </PendingLink>
      <PendingLink
        scroll={false}
        role="tab"
        aria-selected={current === "confirm"}
        href={`/dashboard?filter=confirm${jenis ? `&${jenis}` : ""}`}
        onClick={() => setOptimistic("confirm")}
        className={tab(current === "confirm")}
      >
        Perlu Konfirmasi ({confirmCount})
      </PendingLink>
    </div>
  );
}

// Sel tabel desktop: header & body
export const TH =
  "whitespace-nowrap px-6 py-4 text-xs font-semibold uppercase tracking-[0.55px] text-slate-600";
