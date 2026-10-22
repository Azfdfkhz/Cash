"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Eye, EyeOff, Info } from "lucide-react";
import BankInput from "@/components/BankInput";
import { Field, inputCls, maskedAccount } from "@/components/request/fields";
import { useAccountReveal, useReauthIdentity } from "@/components/useAccountReveal";
import { maskAccountNumber } from "@/lib/utils";

// Tombol mata: buka/tutup nomor rekening lengkap (butuh password, seperti di Profil).
function RevealButton({ revealed, onShow, onHide, className = "" }) {
  return (
    <button
      type="button"
      onClick={revealed ? onHide : onShow}
      aria-label={revealed ? "Sembunyikan nomor rekening" : "Lihat nomor rekening lengkap"}
      aria-pressed={revealed}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 ${className}`}
    >
      {revealed ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
    </button>
  );
}

// Rekening tujuan transfer. Kalau rekening dari profil sudah lengkap, tampil
// ringkas (BCA ••• 8821, a.n. ...) dan bisa diubah lewat "Ubah". Begitu
// pengguna mengetik sendiri, isian tetap terbuka (tidak menutup di tengah ketik).
//
// Nomor rekening dari profil tidak pernah tampil utuh begitu saja: untuk
// melihatnya pengguna harus memasukkan password (alur yang sama dengan Profil)
// dan nomor menutup lagi sendiri setelah 30 detik.
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
  // Selama pengguna belum mengetik nomor baru, kolom menampilkan nomor lama
  // tersamar (nilainya tetap dipakai saat mengirim).
  const [typedNumber, setTypedNumber] = useState(false);
  const keepExisting = !typedNumber && Boolean(accountNumber);
  const complete = Boolean(bankName && accountNumber && accountHolder.trim());
  const showFields = editing || touched || !complete;

  const pathname = usePathname();
  const identity = useReauthIdentity();
  const reveal = useAccountReveal({
    email: identity.email,
    canReauthWithPassword: identity.canReauthWithPassword,
    returnTo: pathname || "/dashboard",
  });
  const canReveal = identity.ready && keepExisting;

  if (!showFields) {
    return (
      <Field label="Bank tujuan transfer" required>
        <div className={`${inputCls} flex items-center justify-between gap-2 !py-1.5`}>
          <span className="min-w-0 truncate tabular-nums">
            {reveal.revealed
              ? [bankName, accountNumber].filter(Boolean).join(" ")
              : maskedAccount(bankName, accountNumber)}
            , a.n. {accountHolder}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {canReveal && (
              <RevealButton revealed={reveal.revealed} onShow={reveal.request} onHide={reveal.hide} />
            )}
            <button
              type="button"
              onClick={() => {
                reveal.hide();
                setEditing(true);
              }}
              className="flex h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-brand hover:bg-primary-muted"
            >
              Ubah <ChevronDown size={16} className="text-slate-600" aria-hidden="true" />
            </button>
          </span>
        </div>
        <p className="mt-2 text-sm font-medium text-emerald-700">
          Rekening tujuan terisi dari profil Anda.
        </p>
        {reveal.dialog}
      </Field>
    );
  }

  return (
    <div className="space-y-5">
      {profileBankMissing && (
        <p className="flex max-w-prose gap-2 text-sm text-sky-800">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Rekening default Anda belum lengkap di{" "}
            <Link href="/profile" className="font-semibold underline">
              Pengaturan
            </Link>
            . Isi di sana supaya terisi otomatis setiap mengajukan. Untuk pengajuan ini, isi
            langsung di bawah.
          </span>
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-x-4">
        <Field label="Bank tujuan transfer" required htmlFor="bank-name">
          <BankInput
            id="bank-name"
            required
            value={bankName}
            onChange={(v) => {
              setTouched(true);
              onBankName(v);
            }}
            className={inputCls}
          />
        </Field>
        <Field label="Nomor rekening" required htmlFor="bank-account-number">
          <div className="relative">
            <input
              id="bank-account-number"
              type="text"
              required={!keepExisting}
              inputMode="numeric"
              autoComplete="off"
              value={keepExisting && !reveal.revealed ? "" : accountNumber}
              onChange={(e) => {
                setTouched(true);
                setTypedNumber(true);
                onAccountNumber(e.target.value.replace(/\D/g, ""));
              }}
              className={`${inputCls} tabular-nums ${canReveal ? "pr-12" : ""}`}
              placeholder={
                keepExisting
                  ? `${maskAccountNumber(accountNumber)} (ketik untuk mengganti)`
                  : "Nomor rekening penerima"
              }
            />
            {canReveal && (
              <RevealButton
                revealed={reveal.revealed}
                onShow={reveal.request}
                onHide={reveal.hide}
                className="absolute right-1.5 top-1/2 -translate-y-1/2"
              />
            )}
          </div>
        </Field>
        <div className="lg:col-span-2">
          <Field
            label="Atas nama rekening"
            required
            htmlFor="bank-account-holder"
            helper={
              <p className="mt-2 max-w-prose text-xs text-slate-600">
                Terisi otomatis dari profil. Ubah di sini kalau pengajuan ini pakai rekening lain,
                atau set default di halaman Profil.
              </p>
            }
          >
            <input
              id="bank-account-holder"
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
      </div>
      {reveal.dialog}
    </div>
  );
}
