"use client";

import { useEffect } from "react";
import { Loader2, X } from "lucide-react";

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
  footer,
  onClose,
  children,
  maxWidth = "max-w-4xl",
  closeOnBackdrop = true,
  zIndex = "z-30",
  // Teks status saat proses berjalan (mis. "Mengirim bukti..."): menutup pop up
  // dengan lapisan loading dan mencegah pop up ditutup di tengah proses.
  busy = null,
}) {
  // Escape hanya menutup pop up ini, bukan seluruh panel tinjau di belakangnya.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      if (!busy) onClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, busy]);

  return (
    <div
      onClick={(e) => closeOnBackdrop && !busy && e.target === e.currentTarget && onClose()}
      className={`animate-fade-in absolute inset-0 ${zIndex} flex items-center justify-center bg-slate-900/40 p-4 sm:right-[420px] sm:p-6`}
      role="dialog"
      aria-modal="true"
      aria-label={label ?? title}
    >
      <div
        className={`animate-scale-up relative flex max-h-full w-full ${maxWidth} flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            {badge && <div className="flex flex-wrap items-center gap-1.5">{badge}</div>}
            <h3 className="mt-2 break-words text-lg font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-slate-600">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {headerRight}
            <button
              type="button"
              onClick={onClose}
              disabled={!!busy}
              aria-label="Tutup"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="border-t border-slate-100 px-6 py-3">{footer}</div>}

        {busy && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/90 px-6 text-center backdrop-blur-[2px]"
          >
            <Loader2 size={28} className="animate-spin text-slate-900" />
            <p className="text-sm font-bold text-slate-900">{busy}</p>
            <p className="text-xs text-slate-600">Mohon tunggu, jangan tutup jendela ini.</p>
          </div>
        )}
      </div>
    </div>
  );
}
