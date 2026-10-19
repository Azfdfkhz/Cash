"use client";

import { useState } from "react";

// Satuan yang umum dipakai di RAB. Satuan lain bisa diketik lewat "Lainnya".
export const COMMON_UNITS = [
  "orang",
  "kali",
  "hari",
  "malam",
  "jam",
  "bulan",
  "paket",
  "pcs",
  "buah",
  "unit",
  "set",
  "lembar",
  "rim",
  "box",
  "kotak",
  "botol",
  "porsi",
  "liter",
  "kg",
  "km",
  "tiket",
  "trip",
  "mobil",
  "kamar",
  "kegiatan",
];

const OTHER = "__other__";

// Dropdown satuan + isian manual kalau pilih "Lainnya". Nilai yang tidak ada
// di daftar (mis. hasil import spreadsheet) otomatis tampil sebagai Lainnya.
export default function UnitSelect({ value, onChange, className }) {
  const current = String(value ?? "");
  const known = COMMON_UNITS.find((u) => u === current.trim().toLowerCase());
  const [customMode, setCustomMode] = useState(Boolean(current) && !known);
  const showCustom = customMode || (Boolean(current) && !known);

  return (
    <div className="space-y-1">
      <select
        value={showCustom ? OTHER : known ?? ""}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setCustomMode(true);
            onChange(known ? "" : current);
          } else {
            setCustomMode(false);
            onChange(e.target.value);
          }
        }}
        className={`${className} bg-white`}
      >
        <option value="">Pilih</option>
        {COMMON_UNITS.map((u) => (
          <option key={u} value={u}>
            {u}
          </option>
        ))}
        <option value={OTHER}>Lainnya…</option>
      </select>
      {showCustom && (
        <input
          type="text"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className={className}
          placeholder="Ketik satuan"
          autoFocus={customMode && !current}
        />
      )}
    </div>
  );
}
