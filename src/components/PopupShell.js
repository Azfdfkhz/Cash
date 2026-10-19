"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

// Kerangka pop up mengambang yang sama gayanya dengan CashAdvanceDetailPopup:
// di desktop muncul di area kosong sebelah kiri panel tinjau (lebar 420px),
// di mobile menutupi layar. Dipakai oleh "Catat kwitansi" dan "Kembalikan sisa".
//
// closeOnBackdrop=false untuk form yang berisi isian (jangan sampai hilang
// karena salah klik di luar pop up).
export default function PopupShell({
  label,
  title,
  badge,
  subtitle,
  headerRight,
  onClose,
  children,
  maxWidth = "max-w-4xl",
  closeOnBackdrop = true,
  zIndex = "z-30",
}) {
  // Escape hanya menutup pop up ini, bukan seluruh panel tinjau di belakangnya.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div
      onClick={(e) => closeOnBackdrop && e.target === e.currentTarget && onClose()}
      className={`animate-fade-in absolute inset-0 ${zIndex} flex items-center justify-center bg-slate-900/40 p-4 sm:right-[420px] sm:p-6`}
      role="dialog"
      aria-modal="true"
      aria-label={label ?? title}
    >
      <div
        className={`animate-scale-up flex max-h-full w-full ${maxWidth} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            {badge && <div className="flex flex-wrap items-center gap-1.5">{badge}</div>}
            <h3 className="mt-1.5 break-words text-base font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerRight}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
