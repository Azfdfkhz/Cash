"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isEmailNotConfirmed, mapResendError } from "@/lib/authErrors";
import PrimaryButton, { AuthSpinner } from "@/components/auth/PrimaryButton";
import { Mail, ExternalLink, RefreshCw, Check } from "lucide-react";

// Layar "Konfirmasi email" setelah daftar dengan email.
//
// Masalah sebelumnya: pengguna hanya melihat "Cek email Anda" tanpa tahu apa
// yang harus dilakukan berikutnya dan kapan bisa lanjut. Sekarang layar ini:
//  - menjelaskan 3 langkah dengan jelas;
//  - memantau otomatis: begitu email dikonfirmasi (di HP / tab / perangkat
//    lain), halaman ini langsung lanjut ke langkah 2 tanpa perlu klik apa pun;
//  - menyediakan tombol "Saya sudah konfirmasi" untuk cek manual;
//  - menyediakan kirim ulang email (jeda 60 detik) dan ganti email.
//
// Cara memantau: selama email belum dikonfirmasi, signInWithPassword menolak
// dengan kode email_not_confirmed. Begitu dikonfirmasi, panggilan yang sama
// berhasil dan sesi langsung terbentuk. Kata sandi hanya dipegang di memori
// halaman ini (tidak disimpan ke storage).

const POLL_MS = 15000; // 20 cek / 5 menit, di bawah batas laju Supabase
const MAX_AUTO_CHECKS = 40; // ±10 menit, lalu pantau manual
const RESEND_COOLDOWN_S = 60;

function mailProvider(email) {
  const domain = String(email).split("@")[1]?.toLowerCase() ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return { name: "Gmail", url: "https://mail.google.com/" };
  }
  if (/^(outlook|hotmail|live|msn)\./.test(domain)) {
    return { name: "Outlook", url: "https://outlook.live.com/mail/" };
  }
  if (domain.startsWith("yahoo.")) {
    return { name: "Yahoo Mail", url: "https://mail.yahoo.com/" };
  }
  return null;
}

const STEPS = [
  "Buka email Anda dan cari pesan dari kami (cek juga folder Spam).",
  "Klik tombol konfirmasi di dalam email.",
  "Kembali ke sini. Halaman ini lanjut sendiri ke Langkah 2.",
];

export default function EmailConfirmWaiting({
  email,
  password,
  onConfirmed,
  onChangeEmail,
}) {
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState(null); // { type: "ok" | "info" | "error", text }
  const [autoStopped, setAutoStopped] = useState(false);

  const doneRef = useRef(false);
  const busyRef = useRef(false);
  const autoCountRef = useRef(0);
  const pauseUntilRef = useRef(0);
  const onConfirmedRef = useRef(onConfirmed);
  useEffect(() => {
    onConfirmedRef.current = onConfirmed;
  }, [onConfirmed]);

  const provider = mailProvider(email);

  const check = useCallback(
    async ({ manual = false } = {}) => {
      if (doneRef.current || busyRef.current) return;
      if (!manual && Date.now() < pauseUntilRef.current) return;
      busyRef.current = true;
      if (manual) {
        setChecking(true);
        setMessage(null);
      }
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) {
          // onAuthStateChange bisa lebih dulu menangani; cegah dobel lanjut.
          if (!doneRef.current) {
            doneRef.current = true;
            onConfirmedRef.current();
          }
          return;
        }
        if (error.status === 429) {
          // Kena batas laju: jeda otomatis 1 menit.
          pauseUntilRef.current = Date.now() + 60000;
          if (manual) {
            setMessage({ type: "info", text: "Terlalu sering mengecek. Tunggu sebentar lalu coba lagi." });
          }
          return;
        }
        if (isEmailNotConfirmed(error)) {
          if (manual) {
            setMessage({
              type: "info",
              text: "Email belum dikonfirmasi. Klik tombol konfirmasi di email Anda, lalu tekan tombol ini lagi.",
            });
          }
          return;
        }
        // Penyebab lain (mis. kata sandi tidak cocok): hentikan pantau otomatis.
        autoCountRef.current = MAX_AUTO_CHECKS;
        setAutoStopped(true);
        if (manual) {
          setMessage({
            type: "error",
            text: "Tidak bisa memeriksa otomatis. Coba masuk lewat halaman Masuk setelah email dikonfirmasi.",
          });
        }
      } finally {
        busyRef.current = false;
        if (manual) setChecking(false);
      }
    },
    [email, password]
  );

  // Pantau otomatis: berkala saat tab terlihat, dan seketika saat pengguna
  // kembali ke tab ini (biasanya setelah mengklik tautan di email).
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      if (autoCountRef.current >= MAX_AUTO_CHECKS) {
        setAutoStopped(true);
        return;
      }
      autoCountRef.current += 1;
      check();
    };
    const timer = setInterval(tick, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible" && autoCountRef.current < MAX_AUTO_CHECKS) {
        check();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    // Tab lain di browser yang sama menyelesaikan konfirmasi -> sesi muncul.
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session && !doneRef.current) {
        doneRef.current = true;
        onConfirmedRef.current();
      }
    });

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      sub?.subscription?.unsubscribe();
    };
  }, [check]);

  // Hitung mundur tombol kirim ulang.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setResending(false);
    if (error) {
      setMessage({ type: "error", text: mapResendError(error) });
      return;
    }
    setCooldown(RESEND_COOLDOWN_S);
    setMessage({ type: "ok", text: "Email konfirmasi dikirim ulang. Cek kotak masuk dan folder Spam." });
  }

  return (
    <div className="auth-rise space-y-5" aria-live="polite">
      {/* Progres pendaftaran */}
      <ol className="flex items-center gap-2 text-xs font-semibold" aria-label="Tahap pendaftaran">
        <li className="flex items-center gap-1.5 text-emerald-700">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
            <Check size={12} strokeWidth={3} />
          </span>
          Akun dibuat
        </li>
        <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
        <li className="flex items-center gap-1.5 text-brand">
          <span className="auth-dot-pulse h-2.5 w-2.5 rounded-full bg-brand" aria-hidden="true" />
          Konfirmasi email
        </li>
        <span className="h-px flex-1 bg-slate-200" aria-hidden="true" />
        <li className="text-slate-500">Lengkapi data</li>
      </ol>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 lg:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-muted text-brand">
            <Mail size={22} strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900">Konfirmasi email Anda</p>
            <p className="mt-0.5 text-sm text-slate-600">
              Kami mengirim tautan ke{" "}
              <span className="break-all font-semibold text-slate-900">{email}</span>
            </p>
          </div>
        </div>

        <ol className="mt-5 space-y-3">
          {STEPS.map((text, i) => (
            <li key={text} className="flex items-start gap-3 text-sm text-slate-700">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                {i + 1}
              </span>
              <span className="pt-0.5">{text}</span>
            </li>
          ))}
        </ol>

        {provider && (
          <a
            href={provider.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-full border border-brand bg-white px-4 text-sm font-semibold text-brand hover:bg-primary-muted"
          >
            Buka {provider.name}
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        )}

        <div
          role="status"
          className="mt-5 flex items-center gap-2.5 rounded-2xl bg-slate-50 px-4 py-3 text-[13px] text-slate-600"
        >
          {autoStopped ? (
            <span>
              Pemantauan otomatis berhenti. Setelah mengklik tautan di email, tekan{" "}
              <span className="font-semibold text-slate-900">Saya sudah konfirmasi</span>.
            </span>
          ) : (
            <>
              <span className="auth-spinner !border-slate-300 !border-t-brand shrink-0" aria-hidden="true" />
              <span>Menunggu konfirmasi. Halaman ini lanjut otomatis begitu email dikonfirmasi.</span>
            </>
          )}
        </div>
      </div>

      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={`auth-alert rounded-2xl border px-4 py-3 text-sm ${
            message.type === "error"
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : message.type === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <PrimaryButton type="button" desktop="login" onClick={() => check({ manual: true })} disabled={checking}>
        {checking ? (
          <>
            <AuthSpinner /> Memeriksa...
          </>
        ) : (
          "Saya sudah konfirmasi"
        )}
      </PrimaryButton>

      <div className="flex flex-col items-center gap-2 text-sm text-slate-600 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || resending}
          className="inline-flex items-center gap-1.5 font-semibold text-brand disabled:cursor-not-allowed disabled:text-slate-500"
        >
          <RefreshCw size={14} className={resending ? "animate-spin" : ""} aria-hidden="true" />
          {resending
            ? "Mengirim..."
            : cooldown > 0
              ? `Kirim ulang email (${cooldown} dtk)`
              : "Kirim ulang email"}
        </button>
        <button type="button" onClick={onChangeEmail} className="font-semibold text-slate-700 hover:underline">
          Salah email? Ganti email
        </button>
      </div>
    </div>
  );
}
