"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthShell, { SideHeadline, SideSteps } from "@/components/auth/AuthShell";
import AuthField from "@/components/auth/AuthField";
import GoogleButton, { OrDivider } from "@/components/auth/GoogleButton";
import PrimaryButton from "@/components/auth/PrimaryButton";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Check } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: email.split("@")[0] },
        // Setelah klik tautan konfirmasi, lanjut ke langkah 2.
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/register/complete-profile`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      router.push("/register/complete-profile");
      router.refresh();
    } else {
      setDone(true);
    }
  }

  return (
    <AuthShell
      compact
      side={
        <>
          <SideHeadline>
            Buat akun
            <br />
            CashAdvance.
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
          CashAdvance
        </>
      }
      subtitle="Daftar dengan email perusahaan Anda."
    >
      <div className="hidden lg:block mb-8">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-brand">
          Langkah 1 dari 2
        </p>
        <h2 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
          Buat akun
        </h2>
        <p className="mt-3 text-[15px] text-slate-500">
          Daftar dengan email perusahaan Anda.
        </p>
      </div>

      {done ? (
        <div className="rounded-3xl border border-slate-200 p-6 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
            <Check size={24} strokeWidth={2.5} className="text-emerald-600" />
          </div>
          <p className="text-base font-semibold text-slate-900">
            Cek email Anda
          </p>
          <p className="text-sm text-slate-500">
            Kami mengirim tautan konfirmasi ke {email}. Klik tautan itu untuk
            lanjut ke langkah 2 (melengkapi data rekening dan notifikasi).
          </p>
          <Link
            href="/login"
            className="block text-brand font-semibold text-sm mt-4 hover:underline"
          >
            Kembali ke halaman masuk
          </Link>
        </div>
      ) : (
        <>
          {error && (
            <div
              role="alert"
              className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 mb-4"
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
                  className="text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOff size={20} strokeWidth={1.75} />
                  ) : (
                    <Eye size={20} strokeWidth={1.75} />
                  )}
                </button>
              }
            />

            <PrimaryButton type="submit" disabled={loading} className="mt-2">
              {loading ? (
                "Memproses..."
              ) : (
                <>
                  Lanjut <ArrowRight size={18} strokeWidth={2} />
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
    </AuthShell>
  );
}
