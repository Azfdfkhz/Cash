"use client";

import { useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { inputCls } from "@/components/request/fields";

// "2026-10-20" -> "20/10/2026"
export function isoToDisplay(iso) {
  const m = String(iso ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

// "20/10/2026" -> "2026-10-20"; null bila bukan tanggal kalender yang nyata
// (mis. 31/02/2026 atau tahun di luar 1900-2100).
export function displayToIso(display) {
  const m = String(display ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = Number(dd);
  const mo = Number(mm);
  const y = Number(yyyy);
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1) return null;
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  if (d > last) return null;
  return `${yyyy}-${mm}-${dd}`;
}

// Hanya angka, otomatis diberi garis miring: "20102026" -> "20/10/2026".
export function maskDate(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

// Isian tanggal berformat Indonesia dd/mm/yyyy. <input type="date"> bawaan
// browser menampilkan format sesuai bahasa browser/OS (mm/dd/yyyy di banyak
// perangkat), jadi di sini formatnya dikunci: ketik angka (garis miring
// otomatis) atau pilih dari kalender lewat tombol di kanan.
//
// `value` dan `onChange` memakai format ISO "yyyy-mm-dd" (sama seperti
// <input type="date">), sehingga draft & database tidak berubah. onChange
// dipanggil dengan "" selama isian belum berupa tanggal yang valid.
export default function DateInput({
  id,
  value,
  onChange,
  required = false,
  min,
  max,
  className = inputCls,
  "aria-describedby": describedBy,
}) {
  const pickerRef = useRef(null);
  // Teks yang sedang diketik. null = ikuti `value` dari luar.
  const [typed, setTyped] = useState(null);
  const shown = typed ?? isoToDisplay(value);
  const typedIso = typed !== null && typed.length === 10 ? displayToIso(typed) : null;
  const outOfRange = Boolean(typedIso) && ((min && typedIso < min) || (max && typedIso > max));
  const notReal = typed !== null && typed.length === 10 && typedIso === null;
  const invalid = notReal || outOfRange;

  function handleChange(e) {
    const text = maskDate(e.target.value);
    setTyped(text);
    const iso = text.length === 10 ? displayToIso(text) : null;
    const inRange = iso && !(min && iso < min) && !(max && iso > max);
    onChange(inRange ? iso : "");
  }

  function openPicker() {
    const el = pickerRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch {
        // jatuh ke focus() di bawah
      }
    }
    el.focus();
  }

  return (
    <div className="relative">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/yyyy"
        maxLength={10}
        required={required}
        value={shown}
        onChange={handleChange}
        onBlur={() => {
          // Tanggal valid (atau kosong) kembali mengikuti nilai dari luar;
          // ketikan yang salah dibiarkan supaya pesan galatnya tetap terlihat.
          if (typed === "" || (typedIso && !outOfRange)) setTyped(null);
        }}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        pattern="\d{2}/\d{2}/\d{4}"
        title="Tanggal dengan format dd/mm/yyyy"
        className={`${className} pr-12 tabular-nums ${invalid ? "border-rose-500" : ""}`}
      />
      <button
        type="button"
        onClick={openPicker}
        aria-label="Pilih tanggal dari kalender"
        className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
      >
        <Calendar size={18} aria-hidden="true" />
      </button>
      {/* Pemilih tanggal bawaan hanya untuk kalender; teksnya tidak pernah
          ditampilkan. Nilainya selalu ISO sehingga bebas dari bahasa browser. */}
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value || ""}
        min={min}
        max={max}
        onChange={(e) => {
          setTyped(null);
          onChange(e.target.value);
        }}
        className="pointer-events-none absolute bottom-0 right-2 h-0 w-0 opacity-0"
      />
      {invalid && (
        <p role="alert" className="mt-1.5 text-xs text-rose-700">
          {outOfRange
            ? "Tanggal di luar rentang yang diizinkan."
            : "Tanggal tidak valid. Gunakan format dd/mm/yyyy."}
        </p>
      )}
    </div>
  );
}
