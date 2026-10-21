"use client";

import { useEffect } from "react";
import { Check, X } from "lucide-react";

// Hasil aksi yang mengubah data: berhasil (hijau) atau gagal (merah), tampil
// jelas di bawah layar dan hilang sendiri. `notice` = { type: "success" | "error", text }.
// Pesan gagal bertahan lebih lama dan memakai role="alert".
export default function ActionToast({ notice, onDismiss }) {
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(onDismiss, notice.type === "error" ? 8000 : 4000);
    return () => clearTimeout(t);
  }, [notice, onDismiss]);

  if (!notice) return null;
  const ok = notice.type !== "error";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
      <div
        role={ok ? "status" : "alert"}
        className={`animate-scale-up pointer-events-auto flex max-w-md items-start gap-2 rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${
          ok
            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
            : "border-rose-300 bg-rose-50 text-rose-900"
        }`}
      >
        {ok ? (
          <Check size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        ) : (
          <X size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        )}
        <span className="min-w-0">{notice.text}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Tutup pesan"
          className="-mr-1 ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-black/5"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
