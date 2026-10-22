"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { maskEmail } from "@/lib/utils";

export const REVEAL_SECONDS = 30;

const ghostBtn =
  "rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60";
const primaryBtn =
  "rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60";
const fieldCls =
  "w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";

// Membuka nomor rekening lengkap butuh autentikasi ulang (password), sama
// seperti di halaman Profil. Akun email memasukkan password; akun Google yang
// belum punya password membuatnya dulu lewat kode yang dikirim ke email.
// Nomor disembunyikan lagi otomatis setelah REVEAL_SECONDS detik.
//
// Pakai: const reveal = useAccountReveal({ email, canReauthWithPassword });
//   reveal.revealed   -> true selama nomor boleh tampil penuh
//   reveal.request()  -> membuka dialog password
//   reveal.hide()     -> menyembunyikan lagi
//   reveal.dialog     -> render di mana saja (memakai portal ke <body>)
export function useAccountReveal({ email, canReauthWithPassword = true, returnTo = "/profile" }) {
  const [hasPasswordOverride, setHasPasswordOverride] = useState(null);
  const hasPassword = hasPasswordOverride ?? canReauthWithPassword;

  const [revealed, setRevealed] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authInfo, setAuthInfo] = useState("");
  // Alur buat password (akun Google): "ask" -> "code" (kode email + password baru)
  const [setupStep, setSetupStep] = useState("ask");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const hideTimer = useRef(null);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  function hide() {
    clearTimeout(hideTimer.current);
    setRevealed(false);
  }

  function show() {
    setRevealed(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setRevealed(false), REVEAL_SECONDS * 1000);
  }

  function request() {
    setPassword("");
    setAuthError("");
    setAuthInfo("");
    setSetupStep("ask");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setAuthOpen(true);
  }

  async function submitReauth(e) {
    e?.preventDefault();
    if (authBusy) return;
    setAuthError("");
    if (hasPassword) {
      if (!password) {
        setAuthError("Masukkan password Anda.");
        return;
      }
      setAuthBusy(true);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setAuthBusy(false);
      if (error) {
        setAuthError("Password salah.");
        return;
      }
    }
    setPassword("");
    setAuthOpen(false);
    show();
  }

  // Lupa password: kirim tautan reset ke email akun. Setelah mengatur password
  // baru, user kembali ke halaman ini dan bisa membuka nomor rekening.
  async function sendResetLink() {
    setAuthError("");
    setAuthInfo("");
    setAuthBusy(true);
    const supabase = createClient();
    const next = encodeURIComponent(`/reset-password?next=${returnTo}`);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
    });
    setAuthBusy(false);
    if (error) {
      setAuthError("Gagal mengirim tautan reset. Coba lagi sebentar lagi.");
      return;
    }
    setAuthInfo(
      `Tautan reset password dikirim ke ${maskEmail(email)}. Buka email itu untuk membuat password baru.`
    );
  }

  // Akun Google: minta kode konfirmasi ke email sebelum membuat password.
  async function sendSetupCode() {
    setAuthError("");
    setAuthInfo("");
    setAuthBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.reauthenticate();
    setAuthBusy(false);
    if (error) {
      setAuthError("Gagal mengirim kode ke email. Coba lagi sebentar lagi.");
      return;
    }
    setAuthInfo(`Kode konfirmasi dikirim ke ${maskEmail(email)}.`);
    setSetupStep("code");
  }

  async function submitSetup(e) {
    e?.preventDefault();
    if (authBusy) return;
    setAuthError("");
    if (!/^\d{6,10}$/.test(code.trim())) {
      setAuthError("Kode dari email berupa 6 angka. Periksa kembali kode Anda.");
      return;
    }
    if (newPassword.length < 8) {
      setAuthError("Password minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setAuthError("Konfirmasi password tidak sama.");
      return;
    }
    setAuthBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
      nonce: code.trim(),
      data: { has_password: true },
    });
    setAuthBusy(false);
    if (error) {
      setAuthError("Kode salah atau sudah kedaluwarsa. Kirim ulang kode lalu coba lagi.");
      return;
    }
    setHasPasswordOverride(true);
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setAuthOpen(false);
    show();
  }

  const title =
    hasPassword || setupStep === "ask" ? "Lihat nomor rekening lengkap" : "Buat password konfirmasi";

  const dialog =
    authOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onKeyDown={(e) => e.key === "Escape" && !authBusy && setAuthOpen(false)}
            className="animate-fade-in fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
          >
            <div className="animate-scale-up w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
              <h2 className="text-base font-bold text-slate-900">{title}</h2>
              <div className="mt-2 text-sm text-slate-700">
                {hasPassword ? (
                  <>
                    <p>
                      Masukkan password untuk melanjutkan. Nomor akan disembunyikan lagi otomatis
                      dalam {REVEAL_SECONDS} detik.
                    </p>
                    <label htmlFor="reveal-password" className="sr-only">
                      Password
                    </label>
                    <input
                      id="reveal-password"
                      type="password"
                      autoFocus
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitReauth(e)}
                      className={`${fieldCls} mt-3`}
                      placeholder="Password"
                    />
                    {authError && (
                      <p role="alert" className="mt-1.5 text-xs text-rose-700">
                        {authError}
                      </p>
                    )}
                    {authInfo && <p className="mt-2 text-xs text-emerald-700">{authInfo}</p>}
                    <button
                      type="button"
                      onClick={sendResetLink}
                      disabled={authBusy}
                      className="mt-2 text-xs font-semibold text-brand hover:underline disabled:opacity-60"
                    >
                      Lupa password? Kirim tautan reset ke email
                    </button>
                  </>
                ) : setupStep === "ask" ? (
                  <>
                    <p>
                      Akun Anda masuk lewat Google, jadi belum punya password. Untuk melihat nomor
                      rekening lengkap, buat password konfirmasi dulu. Kami kirim kode ke{" "}
                      <span className="font-semibold">{maskEmail(email)}</span> untuk memastikan ini
                      Anda.
                    </p>
                    {authError && (
                      <p role="alert" className="mt-2 text-xs text-rose-700">
                        {authError}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    {authInfo && <p className="text-xs text-emerald-700">{authInfo}</p>}
                    <input
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      autoComplete="one-time-code"
                      aria-label="Kode dari email"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))}
                      onKeyDown={(e) => e.key === "Enter" && submitSetup(e)}
                      className={`${fieldCls} mt-3`}
                      placeholder="Kode dari email"
                    />
                    <input
                      type="password"
                      autoComplete="new-password"
                      aria-label="Password baru"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitSetup(e)}
                      className={`${fieldCls} mt-2`}
                      placeholder="Password baru (min. 8 karakter)"
                    />
                    <input
                      type="password"
                      autoComplete="new-password"
                      aria-label="Ulangi password baru"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitSetup(e)}
                      className={`${fieldCls} mt-2`}
                      placeholder="Ulangi password baru"
                    />
                    {authError && (
                      <p role="alert" className="mt-1.5 text-xs text-rose-700">
                        {authError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={sendSetupCode}
                      disabled={authBusy}
                      className="mt-2 text-xs font-semibold text-brand hover:underline disabled:opacity-60"
                    >
                      Kirim ulang kode
                    </button>
                  </>
                )}
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAuthOpen(false)}
                  disabled={authBusy}
                  className={ghostBtn}
                >
                  Batal
                </button>
                {hasPassword ? (
                  <button type="button" onClick={submitReauth} disabled={authBusy} className={primaryBtn}>
                    {authBusy ? "Memeriksa..." : "Tampilkan"}
                  </button>
                ) : setupStep === "ask" ? (
                  <button type="button" onClick={sendSetupCode} disabled={authBusy} className={primaryBtn}>
                    {authBusy ? "Mengirim..." : "Kirim kode ke email"}
                  </button>
                ) : (
                  <button type="button" onClick={submitSetup} disabled={authBusy} className={primaryBtn}>
                    {authBusy ? "Menyimpan..." : "Simpan & tampilkan"}
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return { revealed, request, hide, dialog };
}

// Info akun yang dibutuhkan untuk autentikasi ulang di halaman klien
// (email + apakah akun punya password). Dibaca dari sesi Supabase.
export function useReauthIdentity() {
  const [identity, setIdentity] = useState({ email: "", canReauthWithPassword: true, ready: false });
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!active || !user) return;
        setIdentity({
          email: user.email ?? "",
          canReauthWithPassword: Boolean(
            user.app_metadata?.providers?.includes("email") || user.user_metadata?.has_password === true
          ),
          ready: true,
        });
      } catch {
        // Tanpa identitas, tombol lihat rekening tidak ditampilkan.
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  return identity;
}
