"use client";

import { AlertCircle, ArrowRight, Check } from "lucide-react";

// Lompat ke isian yang belum lengkap (dipakai daftar centang & tombol di mobile).
function jumpTo(target) {
  if (!target || typeof document === "undefined") return;
  const el = document.getElementById(target);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const focusable = el.matches("input, select, textarea, button, [tabindex]")
    ? el
    : el.querySelector("input, select, textarea, button, [tabindex]");
  focusable?.focus?.({ preventScroll: true });
}

// Ringkasan validasi (kartu kanan di desktop / di bawah form di mobile).
// Tombol Draft & Kirim: di dalam kartu (desktop) dan menempel di bawah layar
// (mobile). Tombol Kirim memakai atribut `form` karena berada di luar <form>.
// Setiap poin yang belum terpenuhi bisa diklik untuk menuju isiannya.
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
  // Poin bertanda `isDeclaration` bukan isian, jadi tidak dihitung sebagai
  // "isian yang kurang" — pesan tombolnya harus menyebut centang pernyataan.
  const missingFields = checks.filter((c) => !c.ok && !c.isDeclaration);
  const missingCount = missingFields.length;
  const declarationMissing =
    !agreed || checks.some((c) => c.isDeclaration && !c.ok);
  const nextStep = missingFields.find((c) => c.target);

  // Label tombol yang jujur: user tahu persis kenapa tombol belum bisa diklik.
  let submitContent;
  if (loading) {
    submitContent = submitLabel;
  } else if (missingCount > 0) {
    // Sengaja pendek: di kartu ringkasan (340px) label panjang akan terpotong.
    submitContent = `Lengkapi ${missingCount} isian`;
  } else if (declarationMissing) {
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
        disabled={loading}
        className="h-12 shrink-0 whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-50 lg:flex-none"
      >
        Simpan draft
      </button>
      <button
        type="submit"
        form={formId}
        disabled={loading || !ready}
        aria-disabled={!ready}
        title={!ready ? "Lengkapi semua isian dan centang pernyataan SPJ" : undefined}
        className="flex h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#0f172a] px-4 text-sm font-semibold text-white shadow-[0_6px_16px_-6px_rgba(15,23,42,0.5)] transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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
            role="status"
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
          {checks.map((c) =>
            c.ok ? (
              <li key={c.label} className="flex items-center gap-3 text-sm text-slate-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <Check size={12} strokeWidth={3.5} />
                </span>
                <span>{c.label}</span>
              </li>
            ) : (
              <li key={c.label}>
                <button
                  type="button"
                  onClick={() => jumpTo(c.target)}
                  disabled={!c.target}
                  className="flex w-full items-center gap-3 text-left text-sm text-slate-600 transition-colors enabled:hover:text-slate-900"
                >
                  <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300" />
                  <span className="flex-1">{c.label}</span>
                  {c.target && (
                    <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-brand">
                      {c.isDeclaration ? "Centang" : "Isi"}{" "}
                      <ArrowRight size={12} strokeWidth={2.5} />
                    </span>
                  )}
                </button>
              </li>
            )
          )}
        </ul>

        <label
          id="spj-declaration"
          className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-[#fde68a] bg-[#fffbeb] p-4 text-sm leading-relaxed text-[#92400e]"
        >
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
          <p className="mt-3 text-xs leading-relaxed text-slate-400">
            {missingCount > 0
              ? "Klik poin yang belum terpenuhi untuk langsung menuju isiannya."
              : "Centang pernyataan SPJ di atas untuk mengaktifkan tombol kirim."}
          </p>
        )}
        {notice && <p className="mt-3 text-xs text-slate-500">{notice}</p>}
      </section>

      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-5 pt-2.5 pb-3 lg:hidden">
        {!ready && !loading && (nextStep || declarationMissing) && (
          <button
            type="button"
            onClick={() => jumpTo(nextStep ? nextStep.target : "spj-declaration")}
            className="mb-2 flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-amber-700"
          >
            <AlertCircle size={13} className="shrink-0" />
            <span className="truncate">
              Berikutnya: {nextStep ? nextStep.label : "centang pernyataan SPJ"}
            </span>
            <ArrowRight size={12} strokeWidth={2.5} className="shrink-0" />
          </button>
        )}
        <div className="flex gap-3">{actions}</div>
      </div>
    </>
  );
}
