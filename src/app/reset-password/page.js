"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/security";
import AuthShell, { SideHeadline, SideChecklist } from "@/components/auth/AuthShell";
import AuthField from "@/components/auth/AuthField";
import PrimaryButton from "@/components/auth/PrimaryButton";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

// Halaman ini dibuka dari tautan email (sesi "recovery" dibuat oleh
// /auth/callback). Tanpa sesi, middleware mengarahkan ke login.
function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Konfirmasi kata sandi tidak sama.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    // has_password: akun Google yang membuat kata sandi lewat tautan ini juga
    // bisa memakainya untuk membuka nomor rekening di Profil.
    const { error } = await supabase.auth.updateUser({
      password,
      data: { has_password: true },
    });
    setLoading(false);
    if (error) {
      setError(
        /same|different/i.test(error.message)
          ? "Kata sandi baru harus berbeda dari yang lama."
          : "Gagal menyimpan kata sandi. Tautan mungkin sudah kedaluwarsa — minta tautan baru."
      );
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push(safeNextPath(searchParams.get("next")));
      router.refresh();
    }, 1500);
  }

  const toggle = (
    <button
      type="button"
      onClick={() => setShow(!show)}
      aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
      className="text-slate-600 hover:text-slate-700"
    >
      {show ? <EyeOff size={20} strokeWidth={1.75} /> : <Eye size={20} strokeWidth={1.75} />}
    </button>
  );

  return (
    <AuthShell
      variant="login"
      side={
        <>
          <SideHeadline heavy>
            Buat kata sandi
            <br />
            yang baru.
          </SideHeadline>
          <SideChecklist
            items={["Minimal 8 karakter", "Dipakai juga untuk membuka nomor rekening di Profil"]}
          />
        </>
      }
      title={
        <>
          Kata sandi
          <br />
          baru
        </>
      }
    >
      <h2 className="text-[28px] lg:text-4xl font-bold lg:font-extrabold tracking-tight text-slate-900 lg:text-[#0c1322] mb-6">
        Kata sandi baru
      </h2>

      {done ? (
        <div
          role="status"
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800"
        >
          Kata sandi berhasil diperbarui. Mengalihkan...
        </div>
      ) : (
        <>
          {error && (
            <div
              role="alert"
              className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3 mb-4"
            >
              {error}{" "}
              <Link href="/forgot-password" className="font-semibold underline">
                Minta tautan baru
              </Link>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <AuthField
              id="password"
              label="Kata sandi baru"
              icon={Lock}
              type={show ? "text" : "password"}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              shape="soft"
              trailing={toggle}
            />
            <AuthField
              id="confirm"
              label="Ulangi kata sandi"
              icon={Lock}
              type={show ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Ketik ulang kata sandi"
              shape="soft"
            />
            <PrimaryButton type="submit" disabled={loading} desktop="login">
              {loading ? "Menyimpan..." : "Simpan kata sandi"}
            </PrimaryButton>
          </form>
        </>
      )}
    </AuthShell>
  );
}
