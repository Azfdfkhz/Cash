"use client";

import { createContext, useContext, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import CashAdvanceCardSkeleton from "@/components/skeletons/CashAdvanceCardSkeleton";

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
      {children}
    </FilterContext.Provider>
  );
}

export default function KindFilter() {
  const { kind, select } = useContext(FilterContext);
  return (
    <div className="flex gap-1.5 overflow-x-auto" role="tablist" aria-label="Filter jenis pengajuan">
      {OPTIONS.map((opt) => {
        const selected = kind === opt.value;
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
          </button>
        );
      })}
    </div>
  );
}

// Isi yang ikut berganti saat filter diganti: selama data baru dimuat,
// tampilkan skeleton.
export function KindFilterContent({ children, skeletons = 3 }) {
  const { pending } = useContext(FilterContext);
  if (!pending) return children;
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: skeletons }, (_, i) => (
        <CashAdvanceCardSkeleton key={i} />
      ))}
    </div>
  );
}
