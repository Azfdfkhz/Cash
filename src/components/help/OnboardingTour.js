"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ONBOARDING_VERSION, onboardingSteps } from "@/lib/helpContent";

export const OPEN_ONBOARDING_EVENT = "open-onboarding";

// Penanda "sudah dilihat" disimpan di metadata akun Supabase Auth
// (user_metadata.onboarding_seen), pola yang sama dengan onboarding_pending.
// Tidak ada perubahan skema database. Gagal menyimpan tidak menghalangi
// penggunaan aplikasi.
async function markSeen() {
  try {
    const supabase = createClient();
    await supabase.auth.updateUser({ data: { onboarding_seen: ONBOARDING_VERSION } });
  } catch {
    /* abaikan: paling buruk panduan muncul lagi saat muat ulang */
  }
}

export default function OnboardingTour({ role, seen }) {
  const steps = onboardingSteps(role);
  const [open, setOpen] = useState(!seen);
  const [index, setIndex] = useState(0);
  const dialogRef = useRef(null);

  // Buka ulang dari Pusat Bantuan.
  useEffect(() => {
    function reopen() {
      setIndex(0);
      setOpen(true);
    }
    window.addEventListener(OPEN_ONBOARDING_EVENT, reopen);
    return () => window.removeEventListener(OPEN_ONBOARDING_EVENT, reopen);
  }, []);

  // Fokus ke dialog saat terbuka; Escape = lewati.
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") finish();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function finish() {
    setOpen(false);
    if (!seen) markSeen();
  }

  if (!open) return null;

  const step = steps[index];
  const last = index === steps.length - 1;
  // Langkah pertama = sambutan (tanpa nomor); sisanya bernomor.
  const numbered = index > 0;

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && finish()}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        className="animate-scale-up w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.6px] text-brand">
            {numbered ? `Langkah ${index} dari ${steps.length - 1}` : "Pengenalan singkat"}
          </p>
          <button
            type="button"
            onClick={finish}
            aria-label="Tutup pengenalan"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <X size={15} />
          </button>
        </div>

        <h2 id="onboarding-title" className="mt-2 text-xl font-bold text-slate-900">
          {step.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.body}</p>

        <div className="mt-5 flex items-center gap-1.5" aria-hidden="true">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-slate-900" : "w-1.5 bg-slate-200"
              }`}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={finish}
            className="text-sm font-semibold text-slate-500 hover:text-slate-700"
          >
            Lewati
          </button>
          <div className="flex items-center gap-2">
            {index > 0 && (
              <button
                type="button"
                onClick={() => setIndex(index - 1)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Kembali
              </button>
            )}
            {last ? (
              <Link
                href="/help"
                onClick={finish}
                className="rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
              >
                Selesai · Buka panduan
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setIndex(index + 1)}
                className="rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800"
              >
                Lanjut
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
