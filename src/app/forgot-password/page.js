"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AuthShell, { SideHeadline, SideChecklist } from "@/components/auth/AuthShell";
import AuthField from "@/components/auth/AuthField";
import PrimaryButton from "@/components/auth/PrimaryButton";

// Lupa kata sandi: kirim tautan reset ke email. Tautan membuka
// /auth/callback (menukar kode jadi sesi) lalu /reset-password.
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    const next = encodeURIComponent("/reset-password");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
    });
    setLoading(false);
    // Respons sengaja sama untuk email terdaftar maupun tidak, supaya tidak
    // bisa dipakai menebak email yang terdaftar. Hanya error jaringan/limit yang ditampilkan.
    if (error && /rate|limit|network|fetch/i.test(error.message)) {
      setError("Terlalu banyak permintaan atau koneksi bermasalah. Coba lagi sebentar lagi.");
      return;
    }
    setSent(true);
  }

  return (
    <AuthShell
      variant="login"
      side={
        <>
          <SideHeadline heavy>
            Atur ulang
            <br />
            kata sandi Anda.
          </SideHeadline>
          <SideChecklist
            items={[
              "Tautan dikirim ke email akun Anda",
              "Buat kata sandi baru dalam satu langkah",
              "Tautan hanya berlaku sementara",
            ]}
          />
        </>
      }
      title={
        <>
          Lupa
          <br />
          kata sandi
        </>
      }
    >
      <h2 className="text-[28px] lg:text-4xl font-bold lg:font-extrabold tracking-tight text-slate-900 lg:text-[#0c1322] mb-2">
        Lupa kata sandi
      </h2>
      <p className="text-sm leading-[22.75px] text-[#64748b] mb-6">
        Masukkan email akun Anda. Kami kirim tautan untuk membuat kata sandi baru.
      </p>

      {sent ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800"
        >
          Jika <span className="font-semibold">{email}</span> terdaftar, tautan reset kata sandi
          sudah dikirim. Periksa kotak masuk (dan folder spam), lalu buka tautannya.
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
            <PrimaryButton type="submit" disabled={loading} desktop="login">
              {loading ? "Mengirim..." : "Kirim tautan reset"}
            </PrimaryButton>
          </form>
        </>
      )}

      <p className="text-center text-sm text-slate-600 mt-6">
        <Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-brand">
          <ArrowLeft size={15} /> Kembali ke halaman masuk
        </Link>
      </p>
    </AuthShell>
  );
}
