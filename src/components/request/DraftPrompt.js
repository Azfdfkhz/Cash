"use client";

import { FileClock } from "lucide-react";

function ago(iso) {
  if (!iso) return "";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  return `${Math.round(hrs / 24)} hari lalu`;
}

// Pop up saat membuka formulir pengajuan baru dan ada draft tersimpan:
// lanjutkan draft, atau tidak (draft dihapus, formulir mulai kosong).
export default function DraftPrompt({ draft, kindLabel, onContinue, onDiscard }) {
  if (!draft) return null;
  const title = (draft.purpose || "").trim();
  return (
    <div
      className="animate-fade-in fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="draft-prompt-title"
    >
      <div className="animate-scale-up w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <FileClock size={20} />
        </span>
        <h3 id="draft-prompt-title" className="mt-3 text-sm font-bold text-slate-900">
          Lanjutkan draft {kindLabel}?
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">
          Ada pengajuan yang belum terkirim
          {title ? (
            <>
              {" "}
              (<span className="font-semibold text-slate-900">{title}</span>)
            </>
          ) : null}
          {draft._savedAt ? `, tersimpan ${ago(draft._savedAt)}` : ""}.
          {draft._reason === "error" ? " Pengiriman sebelumnya gagal." : ""} Pilih
          &quot;Tidak&quot; untuk memulai dari awal; draft lama akan dihapus.
        </p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Tidak
          </button>
          <button
            type="button"
            onClick={onContinue}
            autoFocus
            className="rounded-full bg-[#0f172a] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
          >
            Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
}
