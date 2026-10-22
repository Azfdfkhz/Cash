"use client";

import { useId } from "react";
import { BANKS, normalizeBankName } from "@/lib/banks";

// Isian nama bank dengan saran dari daftar bank Indonesia (ketik untuk
// mencari). Saat keluar dari isian, ketikan dinormalkan ke nama baku
// (mis. "bca" -> "BCA"). Bank di luar daftar tetap bisa diketik manual.
export default function BankInput({
  id,
  value,
  onChange,
  required,
  className,
  placeholder = "Ketik untuk mencari, mis. BCA, Mandiri, BRI",
}) {
  const listId = useId();
  return (
    <>
      <input
        id={id}
        type="text"
        required={required}
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          const normalized = normalizeBankName(e.target.value);
          if (normalized !== e.target.value) onChange(normalized);
        }}
        autoComplete="off"
        className={className}
        placeholder={placeholder}
      />
      <datalist id={listId}>
        {BANKS.map((bank) => (
          <option key={bank.name} value={bank.name} />
        ))}
      </datalist>
    </>
  );
}
