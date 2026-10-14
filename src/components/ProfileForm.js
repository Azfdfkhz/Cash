"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ProfileForm({
  profileId,
  initialChatId,
  initialBankName,
  initialBankAccountNumber,
}) {
  const router = useRouter();
  const [chatId, setChatId] = useState(initialChatId || "");
  const [bankName, setBankName] = useState(initialBankName || "");
  const [bankAccountNumber, setBankAccountNumber] = useState(
    initialBankAccountNumber || ""
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

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"
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
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Bank Tujuan Transfer (dengan atas nama)
        </label>
        <input
          type="text"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          placeholder="Contoh: BCA, Mandiri, BRI"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nomor Rekening
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={bankAccountNumber}
          onChange={(e) =>
            setBankAccountNumber(e.target.value.replace(/\D/g, ""))
          }
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          placeholder="Nomor rekening penerima"
        />
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Rekening ini otomatis terisi saat mengajukan Cash Advance, jadi tidak
          perlu diketik ulang. Tetap bisa diubah per pengajuan.
        </p>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Telegram Chat ID
        </label>
        <input
          type="text"
          inputMode="numeric"
          value={chatId}
          onChange={(e) => setChatId(e.target.value.replace(/\D/g, ""))}
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          placeholder="Contoh: 123456789"
        />
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Diisi supaya Anda dapat notifikasi Telegram saat pengajuan Cash
          Advance disetujui atau ditolak. Caranya:
          <br />
          1. Chat bot <span className="font-medium">@userinfobot</span> di
          Telegram untuk tahu Chat ID Anda (angka).
          <br />
          2. Cari bot notifikasi perusahaan dan tekan{" "}
          <span className="font-medium">/start</span> (wajib, kalau tidak
          notifikasi tidak akan terkirim).
          <br />
          3. Masukkan Chat ID dari langkah 1 di sini.
        </p>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-medium rounded-lg py-2.5 transition-colors"
      >
        {saving ? "Menyimpan..." : "Simpan"}
      </button>
    </form>
  );
}
