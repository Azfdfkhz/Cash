"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

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
      options: { data: { full_name: email.split("@")[0] } },
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
    <main className="min-h-dvh flex flex-col bg-white">
      {/* Dark Navy Header */}
      <div className="bg-dark-navy px-6 pt-12 pb-32">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-6">
          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Logo className="text-white" size={20} />
          </div>
          <span className="text-white font-semibold text-base">
            CashAdvance
          </span>
        </div>

        {/* Step indicator */}
        <div className="mb-4">
          <p className="text-slate-400 text-xs mb-2">Langkah 1 dari 2 · Akun</p>
          <div className="flex gap-1.5">
            <div className="h-1 flex-1 rounded-full bg-brand" />
            <div className="h-1 flex-1 rounded-full bg-white/20" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-white text-3xl font-bold leading-tight mt-4">
          Buat akun
          <br />
          CashAdvance
        </h1>
        <p className="text-slate-400 text-sm mt-2">
          Daftar dengan email perusahaan Anda.
        </p>
      </div>

      {/* White Form Card */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-16 px-6 pt-8 pb-8">
        <div className="max-w-sm mx-auto">
          {done ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-3 mt-4">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-2">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-emerald-600"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="text-base font-semibold text-slate-900">
                Cek email Anda
              </p>
              <p className="text-sm text-slate-500">
                Pendaftaran berhasil. Silakan cek email Anda untuk konfirmasi
                akun sebelum masuk.
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
                <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-4">
                  {error}
                </div>
              )}

              {/* Google Signup */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-2.5 border border-slate-200 hover:bg-slate-50 disabled:opacity-60 text-slate-700 font-medium rounded-full py-3 transition-colors"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
                  />
                </svg>
                {googleLoading ? "Memproses..." : "Daftar dengan Google"}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-xs text-slate-400">
                  atau daftar dengan email
                </span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <Mail
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand bg-white placeholder:text-slate-400"
                      placeholder="nama@perusahaan.org"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                    Kata sandi
                  </label>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand bg-white placeholder:text-slate-400"
                      placeholder="Buat kata sandi"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    Minimal 8 karakter.
                  </p>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-dark-navy hover:bg-slate-800 disabled:opacity-60 text-white font-semibold rounded-full py-3.5 transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? "Memproses..." : <>Lanjut <span>→</span></>}
                </button>
              </form>

              {/* Login link */}
              <p className="text-center text-sm text-slate-500 mt-6">
                Sudah punya akun?{" "}
                <Link href="/login" className="text-brand font-semibold">
                  Masuk
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
