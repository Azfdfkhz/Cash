"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Landmark,
  Mail,
  Send,
  User,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import BankInput from "@/components/BankInput";

// Satu baris isian: kotak ikon + label kecil + nilai (sesuai desain Figma).
function Row({ icon: Icon, label, children, trailing }) {
  return (
    <div className="flex items-center gap-4 border-t border-slate-100 px-4 py-3.5 first:border-t-0 focus-within:bg-slate-50/60">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-500">
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <label className="block min-w-0 flex-1">
        <span className="block text-xs text-slate-400">{label}</span>
        {children}
      </label>
      {trailing}
    </div>
  );
}

const valueCls =
  "mt-0.5 block w-full bg-transparent text-[15px] font-semibold text-slate-900 placeholder:font-normal placeholder:text-slate-500 focus:outline-none";
const readOnlyCls = `${valueCls} truncate`;
const sectionLabel =
  "mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500";
const cardCls =
  "overflow-hidden rounded-2xl border border-slate-200 bg-white";

export default function ProfileForm({
  profileId,
  fullName,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Tersimpan.
        </div>
      )}

      <section>
        <h2 className={sectionLabel}>Informasi Akun</h2>
        <div className={cardCls}>
          <Row icon={User} label="Username">
            <input
              type="text"
              value={fullName || ""}
              readOnly
              tabIndex={-1}
              className={readOnlyCls}
            />
          </Row>
          <Row icon={Mail} label="Email">
            <input
              type="text"
              value={email || ""}
              readOnly
              tabIndex={-1}
              className={readOnlyCls}
            />
          </Row>
          <Row icon={Landmark} label="Bank tujuan transfer (dengan atas nama)">
            <BankInput
              value={bankName}
              onChange={setBankName}
              className={valueCls}
              placeholder="Contoh: BCA, Mandiri, BRI (atas nama)"
            />
          </Row>
          <Row icon={CreditCard} label="No. rekening">
            <input
              type="text"
              inputMode="numeric"
              value={bankAccountNumber}
              onChange={(e) =>
                setBankAccountNumber(e.target.value.replace(/\D/g, ""))
              }
              className={valueCls}
              placeholder="Nomor rekening penerima"
            />
          </Row>
          <Row icon={UserRound} label="Atas nama rekening">
            <input
              type="text"
              value={bankAccountHolder}
              onChange={(e) => setBankAccountHolder(e.target.value)}
              className={valueCls}
              placeholder="Nama pemilik rekening sesuai buku tabungan"
            />
          </Row>
        </div>
        <p className="mt-2 px-1 text-xs leading-relaxed text-slate-500">
          Rekening ini otomatis terisi saat mengajukan Cash Advance atau
          Reimbursement, jadi tidak perlu diketik ulang. Tetap bisa diubah per
          pengajuan.
        </p>
      </section>

      <section>
        <h2 className={sectionLabel}>Telegram</h2>
        <div className={cardCls}>
          <Row
            icon={Send}
            label="Telegram Chat ID"
            trailing={
              <a
                href="https://t.me/userinfobot?start=start"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-full border border-brand px-4 py-1.5 text-xs font-semibold text-brand transition-colors hover:bg-primary-muted"
              >
                Open Telegram
              </a>
            }
          >
            <input
              type="text"
              inputMode="numeric"
              value={chatId}
              onChange={(e) => setChatId(e.target.value.replace(/\D/g, ""))}
              className={valueCls}
              placeholder="Contoh: 123456789"
            />
          </Row>
          <div className="border-t border-slate-100 px-5 py-4 text-xs leading-relaxed text-slate-500">
            <p>
              Diisi supaya Anda dapat notifikasi Telegram saat pengajuan Cash
              Advance disetujui atau ditolak. Caranya:
            </p>
            <ol className="mt-2 space-y-1">
              <li>
                1. Chat bot{" "}
                <span className="font-medium">@Userinfobot</span> di Telegram
                untuk tahu Chat ID Anda (angka).
              </li>
              <li>
                2. Cari bot notifikasi perusahaan
                {botUsername && (
                  <>
                    {" "}
                    (
                    <a
                      href={`https://t.me/${botUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand underline"
                    >
                      @{botUsername}
                    </a>
                    )
                  </>
                )}{" "}
                dan tekan <span className="font-medium">/start</span> (wajib,
                kalau tidak notifikasi tidak akan terkirim).
              </li>
              <li>3. Masukkan Chat ID dari langkah 1 di sini.</li>
            </ol>
          </div>
        </div>
      </section>

      <div className="lg:flex lg:justify-end">
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-brand py-3 font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60 lg:w-auto lg:px-8 lg:py-2.5"
        >
          {saving ? "Menyimpan..." : "Simpan"}
        </button>
      </div>
    </form>
  );
}
