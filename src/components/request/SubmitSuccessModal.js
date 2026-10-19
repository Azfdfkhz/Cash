"use client";

import { Check, X } from "lucide-react";

// Popup setelah pengajuan terkirim (sesuai Figma "Pop Up pengajuan").
export default function SubmitSuccessModal({ open, rows = [], onDone }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-5 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submit-success-title"
    >
      <div className="relative w-full max-w-sm rounded-[32px] border border-slate-200 bg-white px-6 pb-6 pt-8 shadow-[0_24px_60px_-12px_rgba(15,23,42,0.25)] animate-scale-up">
        <button
          type="button"
          onClick={onDone}
          aria-label="Tutup"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          <X size={16} strokeWidth={2.25} />
        </button>

        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#111827] text-white shadow-[0_10px_24px_-6px_rgba(15,23,42,0.4)]">
          <Check size={38} strokeWidth={3} />
        </div>
        <h2 id="submit-success-title" className="mt-5 text-center text-2xl font-bold text-slate-900">
          Pengajuan Terkirim
        </h2>
        <p className="mx-auto mt-2 max-w-[17rem] text-center text-sm leading-relaxed text-slate-500">
          Pengajuan telah diteruskan ke tim operasional untuk menunggu verifikasi.
        </p>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-2 border-b border-dashed border-slate-300 pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pengajuan</span>
            <span className="rounded-full border border-emerald-200 bg-[#e8f8ee] px-3 py-1 text-xs font-bold text-[#047857]">
              Menunggu Verifikasi
            </span>
          </div>
          <dl className="mt-3 space-y-3 text-sm">
            {rows.map((r) => (
              <div key={r.label} className="flex justify-between gap-3">
                <dt className="text-slate-500">{r.label}</dt>
                <dd className="text-right font-bold text-slate-900">{r.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <button
          type="button"
          onClick={onDone}
          className="mt-5 h-12 w-full rounded-full bg-[#111827] text-sm font-semibold text-white shadow-[0_8px_20px_-8px_rgba(15,23,42,0.5)] hover:bg-slate-800"
        >
          Selesai &amp; Kembali ke Beranda
        </button>
      </div>
    </div>
  );
}
