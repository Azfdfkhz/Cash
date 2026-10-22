"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthShell, { SideHeadline, SideSteps } from "@/components/auth/AuthShell";
import AuthField, { AuthLabel } from "@/components/auth/AuthField";
import PrimaryButton from "@/components/auth/PrimaryButton";
import BankSelectModal from "@/components/BankSelectModal";
import { User, Building2, CreditCard, Send, ChevronRight, Info, ExternalLink } from "lucide-react";
import { openTelegramBot, USERINFO_BOT, NOTIFY_BOT } from "@/lib/telegramLinks";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankHolderName, setBankHolderName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [profileId, setProfileId] = useState(null);

  // Get current user on mount
  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setProfileId(user.id);
    }
    loadUser();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Samakan dengan constraint database chk_profiles_username_format
    // (huruf besar/kecil, angka, titik, underscore; 3-30 karakter).
    // Huruf besar/kecil dianggap sama saat cek duplikat (index lower()).
    const cleanUsername = username.trim();
    if (cleanUsername && !/^[A-Za-z0-9_.]{3,30}$/.test(cleanUsername)) {
      setError(
        "Username 3-30 karakter, hanya huruf, angka, titik, dan underscore (tanpa spasi atau tanda -)."
      );
      return;
    }

    setSaving(true);

    const supabase = createClient();
    const displayName = bankHolderName || cleanUsername;
    const payload = {
      full_name: displayName || cleanUsername,
      username: cleanUsername || null,
      // Menandai langkah 2 selesai; tanpa ini dashboard terus mengarahkan
      // kembali ke halaman ini.
      profile_completed_at: new Date().toISOString(),
      bank_name: bankName || null,
      bank_account_number: bankAccountNumber.trim() || null,
      bank_account_holder: bankHolderName.trim() || null,
      telegram_chat_id: telegramChatId.trim() || null,
    };
    let { error: updateError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", profileId);

    // Database lama (migrasi 0034 belum dijalankan) hanya menerima huruf
    // kecil. Coba lagi dengan huruf kecil supaya tetap tersimpan; huruf
    // besar/kecil dianggap sama untuk username.
    if (
      updateError?.code === "23514" &&
      cleanUsername &&
      cleanUsername !== cleanUsername.toLowerCase()
    ) {
      ({ error: updateError } = await supabase
        .from("profiles")
        .update({ ...payload, username: cleanUsername.toLowerCase() })
        .eq("id", profileId));
    }

    setSaving(false);

    if (updateError) {
      setError(
        updateError.code === "23505"
          ? "Nama pengguna sudah dipakai. Coba yang lain."
          : updateError.code === "23514"
            ? "Format data tidak valid. Username hanya boleh huruf, angka, titik, dan underscore (3-30 karakter); periksa juga panjang nama pemilik rekening."
            : "Gagal menyimpan data. Coba lagi."
      );
      return;
    }

    // Langkah 2 selesai -> hapus penanda agar tidak diarahkan ke sini lagi.
    await supabase.auth.updateUser({ data: { onboarding_pending: false } });

    router.push("/dashboard");
    router.refresh();
  }

  function handleBankSave(name, holderName) {
    setBankName(name);
    setBankHolderName(holderName);
  }

  return (
    <AuthShell
      compact
      side={
        <>
          <SideHeadline>
            Satu langkah
            <br />
            lagi untuk
            <br />
            mulai.
          </SideHeadline>
          <SideSteps current={2} />
        </>
      }
      step={{ current: 2, total: 2, label: "Data rekening dan notifikasi" }}
    >
      <p className="hidden lg:block text-xs leading-4 font-bold uppercase tracking-[0.6px] text-[#1d4ed8] mb-2">
        Langkah 2 dari 2
      </p>
      <h2 className="text-2xl lg:text-4xl font-bold lg:font-extrabold tracking-tight lg:leading-10 lg:tracking-[-0.9px] text-slate-900 lg:text-[#111827] mb-2 lg:mb-3">
        Lengkapi data Anda
      </h2>
      <p className="text-[15px] lg:text-[13.5px] leading-relaxed lg:leading-[21.94px] text-slate-600 lg:text-[#596579] mb-6 lg:mb-6">
        <span className="lg:hidden">
          Dipakai untuk pencairan dana dan notifikasi persetujuan.
        </span>
        <span className="hidden lg:inline">
          Data ini dipakai untuk pencairan dana ke rekening Anda dan notifikasi
          persetujuan lewat Telegram.
        </span>
      </p>

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
          id="username"
          label="Username"
          icon={User}
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) =>
            setUsername(e.target.value.replace(/[^A-Za-z0-9_.]/g, ""))
          }
          placeholder="contoh: Rina_W"
        />

        {/* Bank + account */}
        <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-4">
        <div>
          <AuthLabel>Bank tujuan transfer</AuthLabel>
          <button
            type="button"
            onClick={() => setBankModalOpen(true)}
            className="w-full h-13 lg:h-[51px] flex items-center gap-3 rounded-full lg:rounded-2xl border border-slate-300 lg:border-[#d1d5db] bg-white pl-4.5 lg:pl-4 pr-4 text-left text-base lg:text-sm text-slate-800 lg:text-[#374151] lg:shadow-xs hover:border-brand transition-colors focus:outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
          >
            <Building2
              size={20}
              strokeWidth={1.75}
              className="text-slate-600 shrink-0"
            />
            <span className="flex-1 truncate">
              {bankName
                ? `${bankName}${bankHolderName ? ` - ${bankHolderName}` : ""}`
                : "Pilih bank"}
            </span>
            <ChevronRight size={18} className="text-slate-600 shrink-0" />
          </button>
        </div>

        <AuthField
          id="account"
          label="No. rekening"
          icon={CreditCard}
          type="text"
          inputMode="numeric"
          value={bankAccountNumber}
          onChange={(e) =>
            setBankAccountNumber(e.target.value.replace(/\D/g, ""))
          }
          placeholder="Nomor rekening"
        />
        </div>

        {/* Telegram Chat ID */}
        <div>
          <AuthLabel htmlFor="telegram">Telegram Chat ID</AuthLabel>
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <Send
                size={20}
                strokeWidth={1.75}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-600"
              />
              <input
                id="telegram"
                type="text"
                inputMode="numeric"
                value={telegramChatId}
                onChange={(e) =>
                  setTelegramChatId(e.target.value.replace(/\D/g, ""))
                }
                className="w-full h-13 lg:h-[51px] rounded-full lg:rounded-2xl border border-slate-300 lg:border-[#d1d5db] bg-white pl-11.5 lg:pl-11 pr-3 text-base lg:text-sm text-slate-900 placeholder:text-slate-600 lg:shadow-xs focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
                placeholder="Contoh: 123456789"
              />
            </div>
            <button
              type="button"
              onClick={() => openTelegramBot(USERINFO_BOT)}
              className="h-13 lg:h-[51px] shrink-0 rounded-full lg:rounded-[14px] border border-slate-300 lg:border-[#cbd5e1] bg-white px-4 lg:w-[132px] lg:px-0 text-[13px] lg:text-xs font-semibold text-brand lg:text-[#2e64d8] hover:bg-slate-50 transition-colors"
            >
              Buka @{USERINFO_BOT}
            </button>
          </div>

          {/* Info box: dua bot, urut dari mencari Chat ID sampai mengaktifkan notifikasi */}
          <div className="mt-3 flex gap-3 rounded-2xl bg-[#f0f4f9] p-4">
            <Info
              size={18}
              strokeWidth={1.75}
              className="mt-0.5 shrink-0 text-brand"
            />
            <div className="min-w-0 space-y-3 text-[13px] lg:text-xs leading-relaxed lg:leading-[19.5px] text-slate-600 lg:text-[#4b5563]">
              <p>
                <span className="font-semibold text-slate-900">1.</span> Cari{" "}
                <span className="font-semibold text-slate-900">@{USERINFO_BOT}</span>{" "}
                di Telegram untuk tahu Chat ID Anda, lalu isi di kolom di atas.
              </p>
              <div>
                <p>
                  <span className="font-semibold text-slate-900">2.</span> Cari bot
                  notifikasi perusahaan (
                  <span className="font-semibold text-slate-900">@{NOTIFY_BOT}</span>) dan
                  tekan <span className="font-semibold text-slate-900">/start</span>{" "}
                  (wajib, kalau tidak notifikasi tidak akan terkirim).
                </p>
                <button
                  type="button"
                  onClick={() => openTelegramBot(NOTIFY_BOT)}
                  className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-full border border-brand bg-white px-4 text-xs font-semibold text-brand hover:bg-primary-muted transition-colors"
                >
                  Buka @{NOTIFY_BOT}
                  <ExternalLink size={13} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <Link
            href="/register"
            className="hidden lg:flex h-[50px] items-center justify-center rounded-full border border-[#d1d5db] bg-white px-[33px] text-sm font-semibold text-[#1f2937] shadow-xs hover:bg-slate-50 transition-colors"
          >
            Kembali
          </Link>
          <PrimaryButton
            type="submit"
            disabled={saving || !profileId}
            className="lg:w-auto lg:flex-1"
          >
            {saving ? "Menyimpan..." : "Selesaikan pendaftaran"}
          </PrimaryButton>
        </div>
      </form>

      <p className="text-center text-sm text-slate-600 mt-6 lg:hidden">
        Salah email?{" "}
        <Link href="/register" className="font-semibold text-brand">
          Kembali
        </Link>
      </p>

      <BankSelectModal
        isOpen={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        onSave={handleBankSave}
        initialBank={
          bankName
            ? bankName.toLowerCase().split(" ")[0].replace("niaga", "").trim()
            : ""
        }
        initialHolderName={bankHolderName}
      />
    </AuthShell>
  );
}
