"use client";

import { createContext, useContext, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import CashAdvanceCardSkeleton from "@/components/skeletons/CashAdvanceCardSkeleton";
import { PendingNavContext } from "@/components/PendingNav";
import { DEFAULT_KIND } from "@/lib/pagination";

const OPTIONS = [
  { value: "cash_advance", label: "Cash Advance" },
  { value: "reimbursement", label: "Reimbursement" },
];

const FilterContext = createContext({ kind: DEFAULT_KIND, pending: false, select: () => {} });

// Tab jenis pengajuan (Cash Advance | Reimbursement) berbasis URL (?jenis=).
// Saat diklik, tab langsung berpindah (optimistic) dan daftar di dalam
// <KindFilterContent> langsung menampilkan skeleton -- tidak menunggu data
// server dulu baru berpindah. Ganti tab = kembali ke halaman 1.
export function KindFilterProvider({ basePath, active, children }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [kind, setOptimisticKind] = useOptimistic(active ?? DEFAULT_KIND);

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
      q.set("jenis", value);
      q.delete("page");
      q.delete("pencairan");
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

export default function KindFilter({ counts = null, dots = null, className = "" }) {
  const { kind, select } = useContext(FilterContext);
  return (
    <div
      data-tour="kind-filter"
      className={`flex border-b border-slate-200 ${className}`}
      role="tablist"
      aria-label="Jenis pengajuan"
    >
      {OPTIONS.map((opt) => {
        const selected = kind === opt.value;
        const n = counts ? counts[opt.value] : undefined;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => select(opt.value)}
            className={`-mb-px flex flex-1 items-center justify-center gap-2 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition-colors ${
              selected
                ? "border-brand text-brand"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {opt.label}
            {dots?.[opt.value] && (
              <span
                className="h-2 w-2 rounded-full bg-orange-500"
                aria-label="Ada pengajuan yang perlu tindakan"
              />
            )}
            {n !== undefined && (
              <span
                className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
                  selected ? "bg-brand/10 text-brand" : "bg-slate-100 text-slate-500"
                }`}
              >
                {n}
              </span>
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
