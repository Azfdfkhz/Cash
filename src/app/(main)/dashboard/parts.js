"use client";

import { useContext, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { PendingNavContext } from "@/components/PendingNav";

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
      className={`anim-rise card-lift rounded-2xl border p-5 xl:p-6 ${
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

// Tab "Semua | Belum Disetujui (n) | Perlu Konfirmasi (n)" berbasis query ?filter=.
// Gaya garis bawah, tanpa wadah/kartu sendiri, supaya tidak menjadi kartu di
// dalam kartu.
//
// Saat diklik, tab berpindah optimistis seketika (useOptimistic) dan konten di
// dalam <KindFilterContent> langsung menampilkan skeleton — karena navigasi
// dijalankan lewat startTransition yang SAMA dengan KindFilterProvider.
// Tanpa ini, layar "membeku" selama data server dimuat tanpa umpan balik visual.
export function FilterTabs({ filter, pendingCount, confirmCount = 0, kind, size = "md", fill = false }) {
  const jenis = kind ? `jenis=${kind}` : "";
  const router = useRouter();

  // Ambil startTransition dari KindFilterProvider (lewat PendingNavContext).
  // Bila FilterTabs dirender di luar provider (skenario masa depan), fallback
  // ke fungsi no-op agar tidak error.
  const { startTransition } = useContext(PendingNavContext);

  const serverKey = filter === "pending" || filter === "confirm" ? filter : "all";

  // useOptimistic: tab aktif berpindah seketika tanpa menunggu data server.
  // Nilai kembali ke serverKey begitu transisi selesai.
  const [current, setOptimisticTab] = useOptimistic(serverKey);

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

  // Navigasi dijalankan di dalam startTransition dari KindFilterProvider:
  // ini membuat `pending` di FilterContext = true selama navigasi berlangsung,
  // sehingga <KindFilterContent> menampilkan skeleton otomatis.
  function go(href, key) {
    startTransition(() => {
      setOptimisticTab(key);
      router.push(href, { scroll: false });
    });
  }

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
      <button
        role="tab"
        aria-selected={current === "all"}
        onClick={() => go(jenis ? `/dashboard?${jenis}` : "/dashboard", "all")}
        className={tab(current === "all")}
      >
        Semua
      </button>
      <button
        role="tab"
        aria-selected={current === "pending"}
        onClick={() => go(`/dashboard?filter=pending${jenis ? `&${jenis}` : ""}`, "pending")}
        className={tab(current === "pending")}
      >
        Belum Disetujui ({pendingCount})
      </button>
      <button
        role="tab"
        aria-selected={current === "confirm"}
        onClick={() => go(`/dashboard?filter=confirm${jenis ? `&${jenis}` : ""}`, "confirm")}
        className={tab(current === "confirm")}
      >
        Perlu Konfirmasi ({confirmCount})
      </button>
    </div>
  );
}

// Sel tabel desktop: header & body
export const TH =
  "whitespace-nowrap px-6 py-4 text-xs font-semibold uppercase tracking-[0.55px] text-slate-600";
