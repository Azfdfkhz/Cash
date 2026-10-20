"use client";

import { createContext, useContext, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import CashAdvanceCardSkeleton from "@/components/skeletons/CashAdvanceCardSkeleton";
import { PendingNavContext } from "@/components/PendingNav";

const OPTIONS = [
  { value: null, label: "Semua" },
  { value: "cash_advance", label: "Cash Advance" },
  { value: "reimbursement", label: "Reimbursement" },
];

const FilterContext = createContext({ kind: null, pending: false, select: () => {} });

// Filter jenis pengajuan berbasis URL (?jenis=). Saat diklik, pilihan langsung
// berpindah (optimistic) dan daftar di dalam <KindFilterContent> langsung
// menampilkan skeleton -- tidak menunggu data server dulu baru berpindah.
// Ganti filter = kembali ke halaman 1.
export function KindFilterProvider({ basePath, active, children }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setOptimisticKind] = useOptimistic(active ?? null);

  // Tab / paginasi / filter lain di halaman yang sama ikut memakai transition
  // ini lewat <PendingLink>, jadi skeleton tampil untuk SEMUA perpindahan.
  const navigate = (href, { replace = false, scroll } = {}) =>
    startTransition(() => {
      const options = scroll === undefined ? undefined : { scroll };
      if (replace) router.replace(href, options);
      else router.push(href, options);
    });

  function select(value) {
    if (value === kind) return;
    startTransition(() => {
      setOptimisticKind(value);
      const [path, existing = ""] = basePath.split("?");
      const q = new URLSearchParams(existing);
      if (value) q.set("jenis", value);
      const qs = q.toString();
      router.push(qs ? `${path}?${qs}` : path, { scroll: false });
    });
  }

  return (
    <FilterContext.Provider value={{ kind, pending, select }}>
      <PendingNavContext.Provider value={{ pending, navigate }}>
        {children}
      </PendingNavContext.Provider>
    </FilterContext.Provider>
  );
}

export default function KindFilter({ counts = null }) {
  const { kind, select } = useContext(FilterContext);
  return (
    <div className="flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Filter jenis pengajuan">
      {OPTIONS.map((opt) => {
        const selected = kind === opt.value;
        const n = counts ? counts[opt.value ?? "all"] : undefined;
        return (
          <button
            key={opt.label}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => select(opt.value)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              selected
                ? "border-brand bg-brand text-white"
                : "border-slate-300 bg-white text-slate-600 hover:border-brand hover:text-brand"
            }`}
          >
            {opt.label}
            {n !== undefined && (
              <span className={`ml-1.5 ${selected ? "text-white/80" : "text-slate-400"}`}>{n}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Isi yang ikut berganti saat filter diganti: selama data baru dimuat,
// tampilkan skeleton.
export function KindFilterContent({ children, skeletons = 3, fallback = null }) {
  const { pending } = useContext(FilterContext);
  if (!pending) return children;
  if (fallback) return fallback;
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: skeletons }, (_, i) => (
        <CashAdvanceCardSkeleton key={i} />
      ))}
    </div>
  );
}
