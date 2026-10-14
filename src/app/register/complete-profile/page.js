"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";
import BankSelectModal from "@/components/BankSelectModal";
import { User, Building2, CreditCard, TriangleAlert, ChevronRight } from "lucide-react";

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
    setSaving(true);

    const supabase = createClient();
    const displayName = bankHolderName || username;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        full_name: displayName || username,
        bank_name: bankName ? `${bankName}${bankHolderName ? ` a.n. ${bankHolderName}` : ""}` : null,
        bank_account_number: bankAccountNumber.trim() || null,
        telegram_chat_id: telegramChatId.trim() || null,
      })
      .eq("id", profileId);

    setSaving(false);

    if (updateError) {
      setError("Gagal menyimpan data. Coba lagi.");
      return;
    }

    router.push("/dashboard");
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
    <main className="min-h-dvh flex flex-col bg-white">
      {/* Dark Navy Header */}
      <div className="bg-dark-navy px-6 pt-12 pb-28">
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
          <p className="text-slate-400 text-xs mb-2">
            Langkah 2 dari 2 · Data rekening dan notifikasi
          </p>
          <div className="flex gap-1.5">
            <div className="h-1 flex-1 rounded-full bg-brand" />
            <div className="h-1 flex-1 rounded-full bg-brand" />
          </div>
        </div>
      </div>

      {/* White Form Card */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-16 px-6 pt-8 pb-8">
        <div className="max-w-sm mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">
            Lengkapi data Anda
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Dipakai untuk pencairan dana dan notifikasi persetujuan.
          </p>

          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                Username
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand bg-white placeholder:text-slate-400"
                  placeholder="contoh: rina.w"
                />
              </div>
            </div>

            {/* Bank selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                Bank tujuan transfer
              </label>
              <button
                type="button"
                onClick={() => setBankModalOpen(true)}
                className="w-full flex items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-left hover:border-brand hover:bg-slate-50 transition-colors"
              >
                <Building2 size={18} className="text-slate-400 flex-shrink-0" />
                <span
                  className={`flex-1 ${bankName ? "text-slate-800 font-medium" : "text-slate-400"}`}
                >
                  {bankName
                    ? `${bankName}${bankHolderName ? ` - ${bankHolderName}` : ""}`
                    : "Pilih bank"}
                </span>
                <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
              </button>
            </div>

            {/* Account number */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                No. rekening
              </label>
              <div className="relative">
                <CreditCard
                  size={18}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={bankAccountNumber}
                  onChange={(e) =>
                    setBankAccountNumber(e.target.value.replace(/\D/g, ""))
                  }
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand bg-white placeholder:text-slate-400"
                  placeholder="Nomor rekening penerima"
                />
              </div>
            </div>

            {/* Telegram Chat ID */}
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                Telegram Chat ID
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <TriangleAlert
                    size={18}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={telegramChatId}
                    onChange={(e) =>
                      setTelegramChatId(e.target.value.replace(/\D/g, ""))
                    }
                    className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand bg-white placeholder:text-slate-400"
                    placeholder="Contoh: 123456789"
                  />
                </div>
                <button
                  type="button"
                  onClick={openTelegram}
                  className="px-4 py-3 rounded-xl border border-brand text-brand text-sm font-semibold hover:bg-brand/5 transition-colors flex-shrink-0"
                >
                  Open Telegram
                </button>
              </div>

              {/* Info box */}
              <div className="mt-2.5 flex gap-2.5 bg-blue-50 border border-blue-100 rounded-xl p-3">
                <div className="mt-0.5 flex-shrink-0">
                  <div className="h-4 w-4 rounded-full bg-brand/20 flex items-center justify-center">
                    <span className="text-brand text-xs font-bold">i</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cari{" "}
                  <span className="font-semibold text-slate-800">
                    @userinfobot
                  </span>{" "}
                  di Telegram untuk tahu Chat ID Anda. Lalu buka bot notifikasi
                  perusahaan dan tekan{" "}
                  <span className="font-semibold text-slate-800">/start</span>{" "}
                  (wajib, jika tidak notifikasi tidak terkirim).
                </p>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={saving || !profileId}
              className="w-full bg-dark-navy hover:bg-slate-800 disabled:opacity-60 text-white font-semibold rounded-full py-3.5 transition-colors mt-2"
            >
              {saving ? "Menyimpan..." : "Selesaikan pendaftaran"}
            </button>
          </form>

          {/* Back link */}
          <p className="text-center text-sm text-slate-500 mt-5">
            Salah email?{" "}
            <Link href="/register" className="text-brand font-semibold">
              Kembali
            </Link>
          </p>
        </div>
      </div>

      {/* Bank Select Modal */}
      <BankSelectModal
        isOpen={bankModalOpen}
        onClose={() => setBankModalOpen(false)}
        onSave={handleBankSave}
        initialBank={
          bankName
            ? bankName
                .toLowerCase()
                .split(" ")[0]
                .replace("niaga", "")
                .trim()
            : ""
        }
        initialHolderName={bankHolderName}
      />
    </main>
  );
}
