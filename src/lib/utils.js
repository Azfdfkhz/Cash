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

// 1850000 -> "Rp 1,85 jt"; 17000000000 -> "Rp 17 M"; di bawah 1 juta pakai format biasa
export function formatCompactIdr(value) {
  const n = Number(value ?? 0);
  const abs = Math.abs(n);
  if (abs < 1_000_000) return formatCurrency(n);
  const [div, unit] =
    abs >= 1_000_000_000_000 ? [1e12, "T"] : abs >= 1_000_000_000 ? [1e9, "M"] : [1e6, "jt"];
  const num = (n / div).toFixed(2).replace(/\.?0+$/, "").replace(".", ",");
  return `Rp ${num} ${unit}`;
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
  pending: "bg-[#fef3c7] text-[#b45309] border-transparent",
  approved: "bg-[#eff6ff] text-[#1d4ed8] border-transparent",
  rejected: "bg-[#fff0f2] text-[#e11d48] border-[#fccdd5]",
  closed: "bg-[#e8f8ee] text-[#1e824c] border-transparent",
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

// Sel yang diawali = + - @ (atau tab/CR) dieksekusi sebagai rumus oleh Excel /
// Google Sheets ("CSV injection"). Nama vendor / catatan berasal dari input
// user & OCR, jadi diberi awalan ' agar dibaca sebagai teks. Angka murni
// (termasuk negatif) dibiarkan.
export function toCsvValue(value) {
  let str = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(str) && !/^-?\d+(\.\d+)?$/.test(str)) str = `'${str}`;
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

// Ada pengembalian sisa saldo yang sudah dicatat requester tapi belum
// dikonfirmasi tim operasional. Butuh relasi `cash_advance_returns(confirmed_at)`
// ikut di-select pada query daftar.
export function hasPendingReturn(ca) {
  return (ca?.cash_advance_returns ?? []).some((r) => !r.confirmed_at);
}

// "azfdf@gmail.com" -> "az•••@gmail.com" (tetap dikenali, tidak terbaca penuh)
export function maskEmail(email) {
  const value = String(email ?? "");
  const at = value.lastIndexOf("@");
  if (at <= 0) return value;
  const local = value.slice(0, at);
  const shown = local.slice(0, Math.min(2, Math.max(1, local.length - 1)));
  return `${shown}•••${value.slice(at)}`;
}

// "123456789" -> "••••• 6789"; hanya 4 digit terakhir yang tampil.
export function maskAccountNumber(number) {
  const digits = String(number ?? "");
  if (!digits) return "";
  return `••••• ${digits.slice(-4)}`;
}

// Chat ID Telegram: hanya 3 digit terakhir.
export function maskChatId(id) {
  const digits = String(id ?? "");
  if (!digits) return "";
  return `••••${digits.slice(-3)}`;
}


// ── Terbilang: 17000000000 -> "Tujuh belas miliar rupiah" ──
const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];
function terbilang(n) {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${terbilang(n - 10)} belas`;
  if (n < 100) return `${terbilang(Math.floor(n / 10))} puluh${n % 10 ? ` ${terbilang(n % 10)}` : ""}`;
  if (n < 200) return `seratus${n - 100 ? ` ${terbilang(n - 100)}` : ""}`;
  if (n < 1000) return `${terbilang(Math.floor(n / 100))} ratus${n % 100 ? ` ${terbilang(n % 100)}` : ""}`;
  if (n < 2000) return `seribu${n - 1000 ? ` ${terbilang(n - 1000)}` : ""}`;
  for (const [div, name] of [[1e12, "triliun"], [1e9, "miliar"], [1e6, "juta"], [1e3, "ribu"]]) {
    if (n >= div) {
      const rest = n % div;
      return `${terbilang(Math.floor(n / div))} ${name}${rest ? ` ${terbilang(rest)}` : ""}`;
    }
  }
  return "";
}
export function terbilangRupiah(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0 || n >= 1e15) return "";
  const words = terbilang(n);
  return words ? `${words.charAt(0).toUpperCase()}${words.slice(1)} rupiah` : "";
}

// Nominal di atas ini diberi peringatan "pastikan angka benar" di form.
export const LARGE_AMOUNT_WARNING = 100_000_000;

function ageDays(iso) {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return d < 0 ? 0 : d;
}
function ageText(iso) {
  const d = ageDays(iso);
  if (d === null) return "";
  return d === 0 ? "hari ini" : `${d} hari`;
}

// Satu baris "apa langkah berikutnya" untuk kartu pengajuan.
// tone: "act" = ada yang harus dilakukan pembaca; "wait" = menunggu pihak lain.
export function nextAction(ca, operational = false) {
  if (!ca) return null;
  const reim = ca.kind === "reimbursement";
  if (ca.status === "pending") {
    return operational
      ? { tone: "act", text: `Menunggu keputusan Anda · ${ageText(ca.created_at)}` }
      : { tone: "wait", text: "Menunggu persetujuan Operasional" };
  }
  if (ca.status === "rejected") {
    return operational ? null : { tone: "act", text: "Ditolak — baca catatan, lalu ajukan ulang" };
  }
  if (ca.status === "approved") {
    if (!ca.disbursed_at) {
      const age = ageText(ca.reviewed_at ?? ca.created_at);
      return operational
        ? { tone: "act", text: `${reim ? "Siap ditransfer" : "Siap dicairkan"} · disetujui ${age}` }
        : { tone: "wait", text: reim ? "Menunggu transfer dari Operasional" : "Menunggu pencairan dana" };
    }
    if (!reim && !operational) {
      const bal = Number(ca.balance ?? 0);
      if (bal > 0) {
        return { tone: "act", text: `Unggah kwitansi atau kembalikan sisa ${formatCompactIdr(bal)}` };
      }
    }
  }
  return null;
}
