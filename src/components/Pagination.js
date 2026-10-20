"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PendingLink, usePendingNav } from "@/components/PendingNav";

// Navigasi halaman berbasis query param `?page=`. Memakai <PendingLink> supaya
// daftar menampilkan skeleton selama halaman berikutnya dimuat.
// `params`: query lain yang ikut dibawa saat pindah halaman (mis. filter).
// `pageParam`: nama query halaman (default `page`) -- dipakai kalau satu halaman
// punya lebih dari satu daftar bernomor.
//
// Tampilan mengikuti desain: kapsul abu-abu berisi ‹ 1 2 3 (4) 5 … N ›, halaman
// aktif berupa lingkaran hitam, plus kotak "Ke halaman [__] ›" kalau halamannya
// banyak. Nomor memakai elipsis kalau halamannya banyak.

// [1, "…", 4, 5, 6, "…", 12]
function pageItems(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const set = new Set([1, totalPages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => set.add(n));
  if (page >= totalPages - 2) [totalPages - 3, totalPages - 2, totalPages - 1].forEach((n) => set.add(n));
  const nums = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

export default function Pagination({
  page,
  total,
  pageSize,
  basePath,
  params = {},
  pageParam = "page",
}) {
  const router = useRouter();
  const { navigate } = usePendingNav();
  const [jump, setJump] = useState("");

  const href = (p) => {
    // basePath boleh sudah membawa query (mis. "/dashboard?filter=pending")
    const [path, existing = ""] = basePath.split("?");
    const q = new URLSearchParams(existing);
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v);
    q.set(pageParam, String(p));
    return `${path}?${q}`;
  };
  const totalPages = Math.max(1, Math.ceil((total ?? 0) / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  if (totalPages <= 1) return null;

  function goTo(e) {
    e.preventDefault();
    const n = Math.floor(Number(jump));
    if (!Number.isFinite(n) || n < 1 || n > totalPages || n === page) {
      setJump("");
      return;
    }
    setJump("");
    if (navigate) navigate(href(n), { scroll: false });
    else router.push(href(n), { scroll: false });
  }

  const cell =
    "font-num flex h-8 min-w-8 items-center justify-center rounded-full px-1 text-[13px] font-medium text-slate-900";
  const arrow = "flex h-8 w-8 items-center justify-center rounded-full text-slate-900";

  return (
    <nav aria-label="Navigasi halaman" className="space-y-3 pt-1">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="inline-flex max-w-full items-center gap-0.5 rounded-full bg-[#f0f0f0] px-2.5 py-1.5">
          {canPrev ? (
            <PendingLink href={href(page - 1)} aria-label="Halaman sebelumnya" className={`${arrow} hover:bg-black/5`}>
              <ChevronLeft size={16} />
            </PendingLink>
          ) : (
            <span aria-hidden="true" className={`${arrow} text-slate-300`}>
              <ChevronLeft size={16} />
            </span>
          )}

          {pageItems(page, totalPages).map((item, i) =>
            item === "…" ? (
              <span key={`gap-${i}`} aria-hidden="true" className={`${cell} text-slate-500`}>
                …
              </span>
            ) : item === page ? (
              <span key={item} aria-current="page" className={`${cell} h-8 w-8 bg-[#1f1f1f] text-white`}>
                {item}
              </span>
            ) : (
              <PendingLink
                key={item}
                href={href(item)}
                aria-label={`Halaman ${item}`}
                className={`${cell} hover:bg-black/5`}
              >
                {item}
              </PendingLink>
            )
          )}

          {canNext ? (
            <PendingLink href={href(page + 1)} aria-label="Halaman berikutnya" className={`${arrow} hover:bg-black/5`}>
              <ChevronRight size={16} />
            </PendingLink>
          ) : (
            <span aria-hidden="true" className={`${arrow} text-slate-300`}>
              <ChevronRight size={16} />
            </span>
          )}
        </div>

        {totalPages > 7 && (
          <form onSubmit={goTo} className="inline-flex items-center gap-2 rounded-full bg-[#f0f0f0] py-1.5 pl-4 pr-2">
            <label htmlFor={`goto-${pageParam}`} className="text-[13px] font-medium text-slate-900">
              Ke halaman
            </label>
            <input
              id={`goto-${pageParam}`}
              type="number"
              inputMode="numeric"
              min={1}
              max={totalPages}
              value={jump}
              onChange={(e) => setJump(e.target.value)}
              placeholder={String(page)}
              className="font-num h-7 w-14 rounded-md border border-slate-900 bg-white px-1.5 text-center text-[13px] focus:outline-none focus:ring-2 focus:ring-slate-900/20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="submit"
              aria-label="Pergi ke halaman"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-900 hover:bg-black/5"
            >
              <ChevronRight size={16} />
            </button>
          </form>
        )}
      </div>
      <p className="font-num text-center text-xs text-slate-500">
        Halaman {page} dari {totalPages} · {total} data
      </p>
    </nav>
  );
}
