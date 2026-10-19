export function formatCurrency(value) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
}

export function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

const TZ = "Asia/Jakarta";

// "9 Oktober 2026"
export function formatDateLong(value = new Date()) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date(value));
}

// "6 Okt 2026"
export function formatDateShort(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  }).format(new Date(value));
}

// "10 Okt, 09:12"
export function formatDateTimeShort(value) {
  if (!value) return "-";
  const d = new Date(value);
  const date = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: TZ,
  }).format(d);
  const time = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TZ,
  })
    .format(d)
    .replace(".", ":");
  return `${date}, ${time}`;
}

// "Senin, 6 Okt 2026 pukul 09:12 WIB"
export function formatDateTimeFull(value) {
  if (!value) return "-";
  const d = new Date(value);
  const weekday = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    timeZone: TZ,
  }).format(d);
  const date = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  }).format(d);
  const time = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TZ,
  })
    .format(d)
    .replace(".", ":");
  return `${weekday}, ${date} pukul ${time} WIB`;
}

// Generate code like #CA-2026-0142
export function formatCaCode(ca) {
  if (!ca) return "";
  const year = ca.created_at ? new Date(ca.created_at).getFullYear() : new Date().getFullYear();
  const hex = (ca.id || "").replace(/[^a-zA-Z0-9]/g, "");
  const seq = hex.slice(0, 4).toUpperCase() || "0142";
  return `#CA-${year}-${seq}`;
}

// Tenggat LPJ: fund_usage_date or +14 days from created_at
export function formatLpjDeadline(ca) {
  if (ca?.fund_usage_date) {
    return formatDateShort(ca.fund_usage_date);
  }
  if (ca?.created_at) {
    const d = new Date(ca.created_at);
    d.setDate(d.getDate() + 14);
    return formatDateShort(d);
  }
  return "-";
}

// 15000000 -> "15.000.000" (tanpa simbol, untuk kolom "Nominal (Rp)")
export function formatNumber(value) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(
    Number(value ?? 0)
  );
}

// 1850000 -> "Rp 1,85 jt"; di bawah 1 juta pakai format biasa
export function formatCompactIdr(value) {
  const n = Number(value ?? 0);
  if (Math.abs(n) < 1_000_000) return formatCurrency(n);
  const jt = (n / 1_000_000).toFixed(2).replace(/\.?0+$/, "").replace(".", ",");
  return `Rp ${jt} jt`;
}

// "Rina Wulandari" -> "RW"; "Rina Wulandari" -> "Rina W"
export function getInitials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
export function shortName(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0]} ${parts[parts.length - 1][0]}`;
}

export const STATUS_LABEL = {
  pending: "Menunggu",
  approved: "Disetujui",
  rejected: "Ditolak",
  closed: "Selesai",
};

export const STATUS_STYLE = {
  pending: "bg-[#fff6e5] text-[#c27803] border-[#fde7b5]",
  approved: "bg-[#ebf9f0] text-[#1fa653] border-[#c9eed8]",
  rejected: "bg-[#fff0f2] text-[#e11d48] border-[#fccdd5]",
  closed: "bg-[#eef2f6] text-[#64748b] border-[#e2e8f0]",
};

export const FUNDING_SOURCE_LABEL = {
  program: "Program",
  marketing_operasional: "Marketing / Operasional",
  program_lainnya: "Program Lainnya",
};

export const OBJECTIVE_LABEL = {
  penyaluran: "Penyaluran",
  event: "Event",
  lainnya: "Lainnya",
};

export function toCsvValue(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function downloadCsv(filename, lines) {
  const csv = lines.join("\n");
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Rekening perusahaan tujuan pengembalian sisa dana CA dari requester.
export const COMPANY_RETURN_ACCOUNTS = [
  { bank: "Bank Muamalat Indonesia", number: "1080011218", holder: "Yayasan Berbagi Bahagia" },
  { bank: "Bank Mandiri", number: "1300017459507", holder: "Yayasan Berbagi Bahagia" },
];

// "BCA · 1234567890 a.n. Budi". Data lama (sebelum atas nama dipisah) hanya
// punya bank_name yang mungkin sudah memuat atas nama -- ditampilkan apa adanya.
export function formatBankAccount({ bankName, bankAccountNumber, bankAccountHolder }) {
  const main = [bankName, bankAccountNumber].filter(Boolean).join(" · ");
  return bankAccountHolder ? `${main} a.n. ${bankAccountHolder}` : main;
}

// Jenis pengajuan (cash_advances.kind).
export const KIND_LABEL = {
  cash_advance: "Cash Advance",
  reimbursement: "Reimbursement",
};

// Penanda di nama file/folder Drive & laporan.
export const KIND_PREFIX = {
  cash_advance: "CA",
  reimbursement: "RB",
};

// Kategori kwitansi reimbursement (tidak pakai RAB).
export const REIMBURSEMENT_CATEGORIES = [
  "Transport",
  "Konsumsi",
  "Akomodasi",
  "Perlengkapan & ATK",
  "Komunikasi & Internet",
  "Cetak & Dokumentasi",
  "Lainnya",
];
