"use client";

import { ArrowRight, Check } from "lucide-react";

// Ringkasan validasi (kartu kanan di desktop / di bawah form di mobile).
// Tombol Draft & Kirim: di dalam kartu (desktop) dan menempel di bawah layar
// (mobile). Tombol Kirim memakai atribut `form` karena berada di luar <form>.
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
  submitLabel = "Kirim Pengajuan",
  notice,
}) {
  const ready = checks.every((c) => c.ok) && agreed;
  const missingCount = checks.filter((c) => !c.ok).length;

  // Label tombol yang jujur: user tahu persis kenapa tombol belum bisa diklik.
  let submitContent;
  if (loading) {
    submitContent = submitLabel;
  } else if (missingCount > 0) {
    submitContent = `Lengkapi ${missingCount} isian lagi`;
  } else if (!agreed) {
    submitContent = "Centang pernyataan SPJ";
  } else {
    submitContent = (
      <>
        Kirim Pengajuan <ArrowRight size={16} strokeWidth={2.25} />
      </>
    );
  }

  const actions = (
    <>
      <button
        type="button"
        onClick={onDraft}
        className="h-12 shrink-0 rounded-full border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 lg:flex-none"
      >
        Draft
      </button>
      <button
        type="submit"
        form={formId}
        disabled={loading || !ready}
        aria-disabled={!ready}
        title={!ready ? "Lengkapkan semua isian dan centang pernyataan SPJ" : undefined}
        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#0f172a] px-5 text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgba(15,23,42,0.5)] transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitContent}
      </button>
    </>
  );

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:rounded-3xl lg:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Ringkasan validasi</h2>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
              ready ? "bg-[#e8f8ee] text-[#1e824c]" : "bg-[#fef3c7] text-[#b45309]"
            }`}
          >
            {ready ? "Siap dikirim" : "Belum lengkap"}
          </span>
        </div>

        {KindIcon && (
          <p className="mt-4 hidden items-center gap-2 text-sm font-semibold text-slate-800 lg:flex">
            <KindIcon size={16} strokeWidth={1.75} className="text-slate-500" />
            {kindLabel}
          </p>
        )}

        <p className="mt-4 text-sm text-slate-500">{totalLabel}</p>
        <p className="mt-0.5 text-[28px] font-bold leading-9 tracking-tight text-slate-900">
          {total}
        </p>

        {rows.length > 0 && (
          <dl className="mt-4 hidden space-y-2.5 text-sm lg:block">
            {rows.map((r) => (
              <div key={r.label} className="flex justify-between gap-3">
                <dt className="text-slate-500">{r.label}</dt>
                <dd className="text-right font-semibold text-slate-900">{r.value || "-"}</dd>
              </div>
            ))}
          </dl>
        )}

        <ul className="mt-5 space-y-3 border-t border-slate-100 pt-5">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-3 text-sm text-slate-700">
              {c.ok ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check size={12} strokeWidth={3.5} />
                </span>
              ) : (
                <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300" />
              )}
              <span className={c.ok ? "" : "text-slate-500"}>{c.label}</span>
            </li>
          ))}
        </ul>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-4 text-sm leading-relaxed text-[#92400e]">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => onAgreedChange(e.target.checked)}
            className="auth-checkbox mt-0.5"
          />
          <span>{declaration}</span>
        </label>

        <div className="mt-5 hidden gap-3 lg:flex">{actions}</div>
        {!ready && !loading && (
          <p className="mt-3 text-xs text-slate-400">
            Tombol kirim aktif setelah semua centang di atas hijau dan pernyataan SPJ dicentang.
          </p>
        )}
        {notice && <p className="mt-3 text-xs text-slate-500">{notice}</p>}
      </section>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-slate-200 bg-white px-5 pt-3 pb-3 lg:hidden">
        {actions}
      </div>
    </>
  );
}
