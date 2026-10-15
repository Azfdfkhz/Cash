"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthShell, { SideHeadline, SideSteps } from "@/components/auth/AuthShell";
import AuthField, { AuthLabel } from "@/components/auth/AuthField";
import PrimaryButton from "@/components/auth/PrimaryButton";
import BankSelectModal from "@/components/BankSelectModal";
import { User, Building2, CreditCard, Send, ChevronRight, Info } from "lucide-react";

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

      // Sudah pernah menyelesaikan langkah 2 -> tidak perlu di sini lagi.
      const { data: existing } = await supabase
        .from("profiles")
        .select("profile_completed_at")
        .eq("id", user.id)
        .single();
      if (existing?.profile_completed_at) {
        router.replace("/dashboard");
        return;
      }

      setProfileId(user.id);
    }
    loadUser();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const uname = username.trim().toLowerCase();
    if (!/^[a-z0-9._]{3,30}$/.test(uname)) {
      setError(
        "Username 3–30 karakter: huruf kecil, angka, titik, atau garis bawah."
      );
      return;
    }
    if (!bankName || !bankHolderName) {
      setError("Pilih bank tujuan dan isi nama pemilik rekening.");
      return;
    }
    if (bankAccountNumber.trim().length < 6) {
      setError("Nomor rekening belum lengkap.");
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const base = {
      full_name: bankHolderName || uname,
      bank_name: `${bankName} a.n. ${bankHolderName}`,
      bank_account_number: bankAccountNumber.trim(),
      telegram_chat_id: telegramChatId.trim() || null,
    };

    let { error: updateError } = await supabase
      .from("profiles")
      .update({
        ...base,
        username: uname,
        profile_completed_at: new Date().toISOString(),
      })
      .eq("id", profileId);

    // 42703 = kolom belum ada (migrasi 0016 belum dijalankan): simpan data
    // inti saja supaya pendaftaran tetap berhasil.
    if (updateError?.code === "42703") {
      ({ error: updateError } = await supabase
        .from("profiles")
        .update(base)
        .eq("id", profileId));
    }

    setSaving(false);

    if (updateError) {
      setError(
        updateError.code === "23505"
          ? "Username sudah dipakai. Coba yang lain."
          : "Gagal menyimpan data. Coba lagi."
      );
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  // "Salah email?" -> keluar dulu, karena /register mengalihkan user yang
  // sudah login ke dashboard.
  async function handleBack() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/register");
    router.refresh();
  }

  function handleBankSave(name, holderName) {
    setBankName(name);
    setBankHolderName(holderName);
  }

  function openTelegram() {
    window.open("https://t.me/userinfobot", "_blank");
  }

  return (
    <AuthShell
      compact
      wide
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
      <p className="hidden lg:block text-[13px] font-semibold uppercase tracking-wider text-brand mb-2">
        Langkah 2 dari 2
      </p>
      <h2 className="text-2xl lg:text-4xl font-bold tracking-tight text-slate-900 mb-2 lg:mb-3">
        Lengkapi data Anda
      </h2>
      <p className="text-[15px] leading-relaxed text-slate-500 mb-6 lg:mb-8">
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
          onChange={(e) => setUsername(e.target.value)}
          placeholder="contoh: rina.w"
          required
          minLength={3}
          maxLength={30}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />

        {/* Bank + account */}
        <div className="space-y-5 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-5">
        <div>
          <AuthLabel>Bank tujuan transfer</AuthLabel>
          <button
            type="button"
            onClick={() => setBankModalOpen(true)}
            className="w-full h-13 flex items-center gap-3 rounded-full border border-slate-300 bg-white pl-4.5 pr-4 text-left text-base lg:text-sm text-slate-800 hover:border-brand transition-colors focus:outline-none focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
          >
            <Building2
              size={20}
              strokeWidth={1.75}
              className="text-slate-500 shrink-0"
            />
            <span className="flex-1 truncate">
              {bankName
                ? `${bankName}${bankHolderName ? ` - ${bankHolderName}` : ""}`
                : "Pilih bank"}
            </span>
            <ChevronRight size={18} className="text-slate-500 shrink-0" />
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
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                id="telegram"
                type="text"
                inputMode="numeric"
                value={telegramChatId}
                onChange={(e) =>
                  setTelegramChatId(e.target.value.replace(/\D/g, ""))
                }
                className="w-full h-13 rounded-full border border-slate-300 bg-white pl-11.5 pr-3 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15"
                placeholder="Contoh: 123456789"
              />
            </div>
            <button
              type="button"
              onClick={openTelegram}
              className="h-13 shrink-0 rounded-full border border-slate-300 bg-white px-4 text-[13px] font-semibold text-brand hover:bg-slate-50 transition-colors"
            >
              Open Telegram
            </button>
          </div>

          {/* Info box */}
          <div className="mt-3 flex gap-3 rounded-2xl bg-[#f0f4f9] p-4">
            <Info
              size={18}
              strokeWidth={1.75}
              className="mt-0.5 shrink-0 text-brand"
            />
            <p className="text-[13px] leading-relaxed text-slate-600">
              Cari{" "}
              <span className="font-semibold text-slate-900">@userinfobot</span>{" "}
              di Telegram untuk tahu Chat ID Anda. Lalu buka bot notifikasi
              perusahaan dan tekan{" "}
              <span className="font-semibold text-slate-900">/start</span>{" "}
              (wajib, jika tidak notifikasi tidak terkirim).
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="hidden lg:flex h-14 items-center justify-center rounded-full border border-slate-200 bg-white px-8 text-[15px] font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
          >
            Kembali
          </button>
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
        <button
          type="button"
          onClick={handleBack}
          className="font-semibold text-brand"
        >
          Kembali
        </button>
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
