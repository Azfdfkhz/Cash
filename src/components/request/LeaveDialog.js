"use client";

import { FileClock } from "lucide-react";

// Pop up saat user mau keluar dari formulir yang sudah terisi:
// simpan ke draft, tidak simpan (draft dihapus), atau batal (tetap di sini).
export default function LeaveDialog({ open, onSave, onDiscard, onCancel }) {
  if (!open) return null;
  return (
    <div
      className="animate-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="leave-dialog-title"
    >
      <div className="animate-scale-up w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <FileClock size={20} />
        </span>
        <h3 id="leave-dialog-title" className="mt-3 text-sm font-bold text-slate-900">
          Simpan ke draft?
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          Pengajuan ini belum dikirim. Simpan ke draft supaya bisa dilanjutkan nanti, atau
          keluar tanpa menyimpan (isian akan hilang).
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onSave}
            autoFocus
            className="rounded-full bg-[#0f172a] px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
          >
            Simpan ke Draft
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-full border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
          >
            Keluar Tanpa Menyimpan
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Batal, Tetap di Sini
          </button>
        </div>
      </div>
    </div>
  );
}
