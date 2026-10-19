"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BankInput from "@/components/BankInput";

export default function ProfileForm({
  profileId,
  email,
  initialChatId,
  initialBankName,
  initialBankAccountNumber,
  initialBankAccountHolder,
  botUsername,
}) {
  const router = useRouter();
  const [chatId, setChatId] = useState(initialChatId || "");
  const [bankName, setBankName] = useState(initialBankName || "");
  const [bankAccountNumber, setBankAccountNumber] = useState(
    initialBankAccountNumber || ""
  );
  const [bankAccountHolder, setBankAccountHolder] = useState(
    initialBankAccountHolder || ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        telegram_chat_id: chatId || null,
        bank_name: bankName.trim() || null,
        bank_account_number: bankAccountNumber.trim() || null,
        bank_account_holder: bankAccountHolder.trim() || null,
      })
      .eq("id", profileId);

    setSaving(false);

    if (updateError) {
      setError("Gagal menyimpan. Coba lagi.");
      return;
    }

    setSaved(true);
    router.back();
    router.refresh();
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand";
  const labelCls = "block text-sm font-medium text-slate-700 mb-1";
  const sectionLabel =
    "hidden lg:block mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500";
  const sectionBox =
    "space-y-4 lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-white lg:p-5";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 lg:space-y-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0"
    >
      {error && (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {saved && (
        <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
          Tersimpan.
        </div>
      )}

      <div>
        <h2 className={sectionLabel}>Informasi Akun</h2>
        <div className={sectionBox}>
          <div className="hidden lg:block">
            <label className={labelCls}>Email</label>
            <input
              type="text"
              value={email || ""}
              readOnly
              disabled
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-500"
            />
          </div>

          <div>
            <label className={labelCls}>
              Bank Tujuan Transfer
            </label>
            <BankInput
              value={bankName}
              onChange={setBankName}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Nomor Rekening</label>
            <input
              type="text"
              inputMode="numeric"
              value={bankAccountNumber}
              onChange={(e) =>
                setBankAccountNumber(e.target.value.replace(/\D/g, ""))
              }
              className={inputCls}
              placeholder="Nomor rekening penerima"
            />
          </div>

          <div>
            <label className={labelCls}>Atas Nama Rekening</label>
            <input
              type="text"
              value={bankAccountHolder}
              onChange={(e) => setBankAccountHolder(e.target.value)}
              className={inputCls}
              placeholder="Nama pemilik rekening sesuai buku tabungan"
            />
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Rekening ini otomatis terisi saat mengajukan Cash Advance atau
              Reimbursement, jadi tidak perlu diketik ulang. Tetap bisa diubah
              per pengajuan.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-4 lg:border-0 lg:pt-0">
        <div className="flex items-center justify-between">
          <h2 className={sectionLabel}>Telegram</h2>
          <a
            href="https://t.me/userinfobot"
            target="_blank"
            rel="noreferrer"
            className="hidden lg:inline-flex mb-2 rounded-full border border-brand px-3 py-1 text-xs font-semibold text-brand hover:bg-primary-muted"
          >
            Buka Telegram
          </a>
        </div>
        <div className={sectionBox}>
          <div>
            <label className={labelCls}>Telegram Chat ID</label>
            <input
              type="text"
              inputMode="numeric"
              value={chatId}
              onChange={(e) => setChatId(e.target.value.replace(/\D/g, ""))}
              className={inputCls}
              placeholder="Contoh: 123456789"
            />
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Diisi supaya Anda dapat notifikasi Telegram saat pengajuan
            disetujui, ditolak, atau dananya ditransfer. Caranya:
            <br />
            1. Chat bot <span className="font-medium">@userinfobot</span> di
            Telegram untuk tahu Chat ID Anda (angka).
            <br />
            2. Masukkan Chat ID dari langkah 1 di sini.
            <br />
            3. Terakhir, buka bot notifikasi{" "}
            {botUsername ? (
              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-brand underline"
              >
                @{botUsername}
              </a>
            ) : (
              <span className="font-medium">perusahaan</span>
            )}{" "}
            di Telegram dan tekan <span className="font-medium">Start</span>{" "}
            (wajib, kalau tidak notifikasi tidak akan terkirim).
          </p>
        </div>
      </div>

      <div className="lg:flex lg:justify-end">
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-medium rounded-lg py-2.5 transition-colors lg:w-auto lg:px-8"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </form>
  );
}
