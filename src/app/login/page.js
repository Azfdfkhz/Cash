"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthShell, { SideHeadline, SideChecklist } from "@/components/auth/AuthShell";
import AuthField from "@/components/auth/AuthField";
import GoogleButton, { OrDivider } from "@/components/auth/GoogleButton";
import PrimaryButton from "@/components/auth/PrimaryButton";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError("Email atau password salah.");
      return;
    }

    router.push(searchParams.get("next") || "/dashboard");
    router.refresh();
  }

  async function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);

    const supabase = createClient();
    const next = searchParams.get("next") || "/dashboard";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setGoogleLoading(false);
      setError("Gagal login dengan Google.");
    }
  }

  return (
    <AuthShell
      variant="login"
      side={
        <>
          <SideHeadline heavy>
            Pengelolaan dana,
            <br />
            dalam satu sistem.
          </SideHeadline>
          <p className="mt-6 text-lg leading-7 text-[#cbd5e1] max-w-md">
            Dari pengajuan hingga pertanggungjawaban, semua tercatat dan dapat
            ditelusuri.
          </p>
          <SideChecklist
            items={[
              "Pengajuan dan persetujuan berjenjang",
              "Pencairan dan pengembalian sisa saldo",
              "Pelaporan kwitansi dan SPJ kegiatan",
            ]}
          />
        </>
      }
      title={
        <>
          Pengelolaan Dana,
          <br />
          dalam satu sistem.
        </>
      }
    >
      <h2 className="text-[28px] lg:text-4xl font-bold lg:font-extrabold tracking-tight lg:leading-10 lg:tracking-[-0.9px] text-slate-900 lg:text-[#0c1322] mb-6 lg:mb-2">
        Masuk
      </h2>
      <p className="hidden lg:block text-sm leading-[22.75px] text-[#64748b] mb-5">
        Gunakan akun yayasan Anda untuk mengelola pengajuan dan pelaporan kas
        bon.
      </p>

      {error && (
        <div
          role="alert"
          className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 mb-4"
        >
          {error}
        </div>
      )}

      <GoogleButton loading={googleLoading} onClick={handleGoogleLogin}>
        Masuk dengan Google
      </GoogleButton>

      <OrDivider>atau masuk dengan email</OrDivider>

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
          shape="soft"
        />

        <AuthField
          id="password"
          label="Kata sandi"
          icon={Lock}
          type={showPassword ? "text" : "password"}
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Masukkan kata sandi"
          shape="soft"
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

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2.5 text-sm text-slate-600 cursor-pointer select-none">
            <input type="checkbox" className="auth-checkbox" />
            Ingat saya
          </label>
          <button
            type="button"
            className="text-sm font-medium text-brand hover:underline"
          >
            Lupa kata sandi?
          </button>
        </div>

        <PrimaryButton type="submit" disabled={loading} desktop="login">
          {loading ? "Memproses..." : "Masuk"}
        </PrimaryButton>
      </form>

      <p className="text-center text-sm text-slate-600 mt-6">
        Belum punya akun?{" "}
        <Link href="/register" className="font-semibold text-brand">
          Daftar sekarang
        </Link>
      </p>

      <div className="flex items-center justify-center gap-5 mt-8 pt-6 border-t border-slate-100">
        <button type="button" className="text-sm text-brand hover:underline">
          Pusat bantuan
        </button>
        <button type="button" className="text-sm text-brand hover:underline">
          Kebijakan &amp; ketentuan
        </button>
      </div>
    </AuthShell>
  );
}
