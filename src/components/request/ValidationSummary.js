"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

// Ringkasan validasi (kartu kanan di desktop / di bawah form di mobile).
// Tombol Draft & Kirim: di dalam kartu (desktop) dan menempel di bawah layar
// (mobile). Tombol Kirim memakai atribut `form` karena berada di luar <form>.
//
// Selama isian belum lengkap tombol Kirim berwarna abu-abu (aria-disabled).
// Tombolnya sengaja tetap bisa difokuskan/diklik: klik hanya menampilkan apa
// yang masih kurang, tidak mengirim apa pun.
export default function ValidationSummary({
  kindLabel,
  kindIcon: KindIcon,
  totalLabel,
  total,
  rows = [],
  checks = [],
  declaration,
  agreed,
  onAgreedChange,
  formId,
  onDraft,
  loading = false,
  submitLabel = "Mengirim...",
  notice,
}) {
  const [attempted, setAttempted] = useState(false);
  const ready = checks.every((c) => c.ok) && agreed;
  const missing = checks.filter((c) => !c.ok).map((c) => c.label);
  if (!ready && missing.length === 0) missing.push("Pernyataan kebijakan belum dicentang");

  function handleSubmitClick(e) {
    if (loading) {
      e.preventDefault();
      return;
    }
    if (!ready) {
      e.preventDefault();
      setAttempted(true);
    }
  }

  const blockedMessage =
    attempted && !ready ? (
      <p role="alert" className="text-xs leading-relaxed text-rose-700">
        Belum bisa dikirim. Lengkapi: {missing.join(", ")}.
      </p>
    ) : null;

  const actions = (
    <>
      <button
        type="button"
        onClick={onDraft}
        className="h-12 shrink-0 rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 lg:flex-none"
      >
        Draft
      </button>
      <button
        type="submit"
        form={formId}
        aria-disabled={!ready || loading}
        onClick={handleSubmitClick}
        className={`flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors ${
          ready
            ? "bg-[#0f172a] text-white shadow-[0_6px_16px_-6px_rgba(15,23,42,0.5)] hover:bg-slate-800 aria-disabled:opacity-60"
            : "cursor-not-allowed bg-slate-200 text-slate-600"
        }`}
      >
        {loading ? (
          submitLabel
        ) : (
          <>
            Kirim Pengajuan <ArrowRight size={16} strokeWidth={2.25} aria-hidden="true" />
          </>
        )}
      </button>
    </>
  );

  return (
    <>
      <section data-tour="req-summary" className="rounded-2xl border border-slate-200 bg-white p-5 lg:rounded-3xl lg:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Ringkasan validasi</h2>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
              ready ? "bg-[#e8f8ee] text-[#176b3d]" : "bg-[#fef3c7] text-[#92400e]"
            }`}
          >
            {ready ? "Siap dikirim" : "Belum lengkap"}
          </span>
        </div>

        {KindIcon && (
          <p className="mt-4 hidden items-center gap-2 text-sm font-semibold text-slate-800 lg:flex">
            <KindIcon size={16} strokeWidth={1.75} className="text-slate-600" aria-hidden="true" />
            {kindLabel}
          </p>
        )}

        <p className="mt-4 text-sm text-slate-600">{totalLabel}</p>
        <p className="mt-0.5 text-[28px] font-bold leading-9 tracking-tight text-slate-900">
          {total}
        </p>

        {rows.length > 0 && (
          <dl className="mt-4 hidden space-y-2.5 text-sm lg:block">
            {rows.map((r) => (
              <div key={r.label} className="flex justify-between gap-3">
                <dt className="text-slate-600">{r.label}</dt>
                <dd className="text-right font-semibold text-slate-900">{r.value || "-"}</dd>
              </div>
            ))}
          </dl>
        )}

        <ul className="mt-5 space-y-3 border-t border-slate-200 pt-5">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-3 text-sm text-slate-800">
              {c.ok ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white">
                  <Check size={12} strokeWidth={3.5} aria-hidden="true" />
                  <span className="sr-only">Terpenuhi:</span>
                </span>
              ) : (
                <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-400">
                  <span className="sr-only">Belum:</span>
                </span>
              )}
              <span className={c.ok ? "" : "text-slate-600"}>{c.label}</span>
            </li>
          ))}
        </ul>

        {/* Pernyataan kebijakan: satu garis pemisah saja, tanpa kotak di dalam kartu. */}
        <label
          data-tour="req-agree"
          className="mt-5 flex cursor-pointer items-start gap-3 border-t border-slate-200 pt-5 text-sm leading-relaxed text-slate-800"
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => onAgreedChange(e.target.checked)}
            className="auth-checkbox mt-0.5"
          />
          <span>{declaration}</span>
        </label>

        <div data-tour="req-actions" className="mt-5 hidden lg:block">
          {blockedMessage && <div className="mb-3">{blockedMessage}</div>}
          <div className="flex gap-3">{actions}</div>
        </div>
        {notice && <p className="mt-3 text-xs text-slate-600">{notice}</p>}
      </section>

      <div data-tour="req-actions" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-5 pt-3 pb-3 lg:hidden">
        {blockedMessage && <div className="mb-2">{blockedMessage}</div>}
        <div className="flex gap-3">{actions}</div>
      </div>
    </>
  );
}
