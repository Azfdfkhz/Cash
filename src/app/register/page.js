"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { mapSignupError } from "@/lib/authErrors";
import AuthShell, { SideHeadline, SideSteps } from "@/components/auth/AuthShell";
import AuthField from "@/components/auth/AuthField";
import GoogleButton, { OrDivider } from "@/components/auth/GoogleButton";
import PrimaryButton, { AuthSpinner } from "@/components/auth/PrimaryButton";
import AuthSuccess, { waitForAuthAnimation } from "@/components/auth/AuthSuccess";
import EmailConfirmWaiting from "@/components/auth/EmailConfirmWaiting";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setGoogleLoading(false);
      setError("Gagal login dengan Google.");
    }
  }

  // Email sudah dikonfirmasi (terdeteksi otomatis atau lewat tombol): sesi sudah
  // terbentuk, lanjut ke langkah 2.
  async function handleEmailConfirmed() {
    setSuccess(true);
    await waitForAuthAnimation();
    router.push("/register/complete-profile");
    router.refresh();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Penanda langkah 2 belum selesai; disimpan di metadata auth sehingga
        // tidak bergantung pada migrasi/backfill kolom di tabel profiles.
        data: { full_name: email.split("@")[0], onboarding_pending: true },
        // Link konfirmasi email diarahkan ke /auth/callback (bukan ke halaman
        // login) supaya user otomatis masuk dan langsung diarahkan ke
        // langkah 2 ("Lengkapi data Anda").
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      setError(mapSignupError(error));
      return;
    }

    if (data.session) {
      setSuccess(true);
      await waitForAuthAnimation();
      router.push("/register/complete-profile");
      router.refresh();
    } else {
      setDone(true);
    }
  }

  return (
    <AuthShell
      compact
      plainBackdrop
      side={
        <>
          <SideHeadline>
            Buat akun
            <br />
            Cash Advance.
          </SideHeadline>
          <p className="mt-6 text-lg text-slate-300">
            Daftar dengan email perusahaan Anda.
          </p>
          <SideSteps current={1} />
        </>
      }
      step={{ current: 1, total: 2, label: "Akun" }}
      title={
        <>
          Buat akun
          <br />
          Cash Advance
        </>
      }
      subtitle="Daftar dengan email perusahaan Anda."
    >
      <div className="hidden lg:block mb-8">
        <p className="text-xs leading-4 font-bold uppercase tracking-[0.6px] text-[#1d4ed8]">
          Langkah 1 dari 2
        </p>
        <h2 className="mt-2 text-4xl font-extrabold leading-10 tracking-[-0.9px] text-[#111827]">
          Buat akun
        </h2>
        <p className="mt-3 text-[13.5px] leading-[21.94px] text-[#596579]">
          Daftar dengan email perusahaan Anda.
        </p>
      </div>

      {done ? (
        <EmailConfirmWaiting
          email={email}
          password={password}
          onConfirmed={handleEmailConfirmed}
          onChangeEmail={() => {
            setDone(false);
            setPassword("");
            setError("");
          }}
        />
      ) : (
        <>
          {error && (
            <div
              role="alert"
              className="auth-alert text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 mb-4"
            >
              {error}
            </div>
          )}

          <GoogleButton loading={googleLoading} onClick={handleGoogleLogin}>
            Daftar dengan Google
          </GoogleButton>

          <OrDivider>atau daftar dengan email</OrDivider>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AuthField
              id="email"
              label="Email"
              icon={Mail}
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@perusahaan.org"
              className="h-14"
            />

            <AuthField
              id="password"
              label="Kata sandi"
              icon={Lock}
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Buat kata sandi"
              hint="Minimal 8 karakter."
              className="h-14"
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  className="text-slate-600 hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOff size={20} strokeWidth={1.75} />
                  ) : (
                    <Eye size={20} strokeWidth={1.75} />
                  )}
                </button>
              }
            />

            <PrimaryButton type="submit" disabled={loading || success} className="mt-2">
              {loading || success ? (
                <>
                  <AuthSpinner /> Memproses...
                </>
              ) : (
                <>
                  Lanjut <ArrowRight size={18} strokeWidth={2} className="auth-arrow" />
                </>
              )}
            </PrimaryButton>
          </form>

          <p className="text-center text-sm text-slate-600 mt-6">
            Sudah punya akun?{" "}
            <Link href="/login" className="font-semibold text-brand">
              Masuk
            </Link>
          </p>
        </>
      )}

      <AuthSuccess
        show={success}
        title="Akun berhasil dibuat"
        subtitle="Selanjutnya, lengkapi data Anda."
        plain
      />
    </AuthShell>
  );
}
