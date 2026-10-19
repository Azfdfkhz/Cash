"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Info } from "lucide-react";
import BankInput from "@/components/BankInput";
import { Field, inputCls, maskedAccount } from "@/components/request/fields";

// Rekening tujuan transfer. Kalau rekening dari profil sudah lengkap, tampil
// ringkas (BCA ••• 8821, a.n. ...) dan bisa diubah lewat "Ubah". Begitu
// pengguna mengetik sendiri, isian tetap terbuka (tidak menutup di tengah ketik).
export default function BankAccountField({
  bankName,
  onBankName,
  accountNumber,
  onAccountNumber,
  accountHolder,
  onAccountHolder,
  profileBankMissing,
}) {
  const [editing, setEditing] = useState(false);
  const [touched, setTouched] = useState(false);
  const complete = Boolean(bankName && accountNumber && accountHolder.trim());
  const showFields = editing || touched || !complete;

  if (!showFields) {
    return (
      <Field label="Bank tujuan transfer" required>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className={`${inputCls} flex items-center justify-between gap-3 text-left`}
        >
          <span className="min-w-0 truncate">
            {maskedAccount(bankName, accountNumber)}, a.n. {accountHolder}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand">
            Ubah <ChevronDown size={16} className="text-slate-500" />
          </span>
        </button>
        <p className="mt-2 text-sm font-medium text-emerald-600">Rekening tujuan terisi dari profil Anda.</p>
      </Field>
    );
  }

  return (
    <div className="space-y-4">
      {profileBankMissing && (
        <div className="flex gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-800">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>
            Rekening default Anda belum lengkap di{" "}
            <Link href="/profile" className="font-semibold underline">
              Pengaturan
            </Link>
            . Isi di sana supaya terisi otomatis setiap mengajukan. Untuk pengajuan ini, isi
            langsung di bawah.
          </p>
        </div>
      )}
      <Field label="Bank tujuan transfer" required>
        <BankInput
          required
          value={bankName}
          onChange={(v) => {
            setTouched(true);
            onBankName(v);
          }}
          className={inputCls}
        />
      </Field>
      <Field label="Nomor rekening" required>
        <input
          type="text"
          required
          inputMode="numeric"
          value={accountNumber}
          onChange={(e) => {
            setTouched(true);
            onAccountNumber(e.target.value.replace(/\D/g, ""));
          }}
          className={inputCls}
          placeholder="Nomor rekening penerima"
        />
      </Field>
      <Field
        label="Atas nama rekening"
        required
        helper={
          <p className="mt-2 text-xs text-slate-500">
            Terisi otomatis dari profil. Ubah di sini kalau pengajuan ini pakai rekening lain, atau
            set default di halaman Profil.
          </p>
        }
      >
        <input
          type="text"
          required
          value={accountHolder}
          onChange={(e) => {
            setTouched(true);
            onAccountHolder(e.target.value);
          }}
          className={inputCls}
          placeholder="Nama pemilik rekening sesuai buku tabungan"
        />
      </Field>
    </div>
  );
}
