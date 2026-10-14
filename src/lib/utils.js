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

export const STATUS_LABEL = {
  pending: "Menunggu Persetujuan",
  approved: "Disetujui",
  rejected: "Ditolak",
  closed: "Selesai",
};

export const STATUS_STYLE = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-rose-100 text-rose-800 border-rose-200",
  closed: "bg-slate-100 text-slate-700 border-slate-200",
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
