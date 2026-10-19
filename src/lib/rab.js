// Helper RAB (Rencana Anggaran Biaya): parsing spreadsheet RAB ke baris
// rab_items, dan hitung total. Dipakai di server (import) dan client (editor).

export function rabItemTotal(item) {
  const quantity = Number(item.quantity) || 0;
  const frequency = Number(item.frequency) || 0;
  const unitPrice = Number(item.unit_price) || 0;
  return Math.round(quantity * frequency * unitPrice * 100) / 100;
}

// Volume RAB satu pos = jumlah x frekuensi (mis. 1 mobil x 2 = 2).
export function rabItemVolume(item) {
  return (Number(item.quantity) || 0) * (Number(item.frequency) || 0);
}

export function formatVolume(value) {
  return Number(value || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

export function rabTotal(items) {
  return (items ?? []).reduce((sum, item) => sum + rabItemTotal(item), 0);
}

// Ambil spreadsheet id + gid dari link Google Sheets.
export function parseSheetUrl(url) {
  const match = String(url || "").match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  const gid = String(url).match(/[#&?]gid=(\d+)/)?.[1] ?? "0";
  return { spreadsheetId: match[1], gid };
}

// "Rp300,000" / "Rp 300.000" / "-Rp25,000" / "1,5" -> number. Pemisah ribuan
// dan desimal bisa koma atau titik tergantung locale spreadsheet, jadi
// ditebak dari polanya.
export function parseNumber(value) {
  let s = String(value ?? "").replace(/[^\d.,-]/g, "");
  if (!/\d/.test(s)) return null;
  const negative = s.includes("-");
  s = s.replace(/-/g, "");

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandSep = decimalSep === "," ? "." : ",";
    s = s.split(thousandSep).join("").replace(decimalSep, ".");
  } else if (lastComma !== -1 || lastDot !== -1) {
    const sep = lastComma !== -1 ? "," : ".";
    const parts = s.split(sep);
    const isThousands =
      parts.length > 2 || parts[parts.length - 1].length === 3;
    s = isThousands ? parts.join("") : parts.join(".");
  }

  const number = Number(s);
  if (!Number.isFinite(number)) return null;
  return negative ? -number : number;
}

// Parser CSV kecil (RFC 4180: kutip ganda, koma & newline di dalam kutip).
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const src = String(text).replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const norm = (v) => String(v ?? "").trim().toLowerCase();

// Ubah isi CSV spreadsheet RAB jadi { title, items }. Baris header dicari dari
// kolom "Uraian"; kolom lain dicocokkan dari namanya, jadi urutan kolom boleh
// beda. Kolom tanpa judul tepat di kanan "Jumlah" dianggap satuannya
// (contoh: 2 | kali). Berhenti di baris "Total".
export function parseRabCsv(text) {
  const rows = parseCsv(text);
  const headerIndex = rows.findIndex((r) => r.some((c) => norm(c) === "uraian"));
  if (headerIndex === -1) {
    throw new Error('Kolom "Uraian" tidak ditemukan di spreadsheet.');
  }

  const header = rows[headerIndex].map(norm);
  const find = (...names) => header.findIndex((h) => names.includes(h));
  const col = {
    description: find("uraian"),
    quantity: find("jumlah", "qty", "volume", "vol"),
    unit: find("satuan", "unit"),
    frequency: find("frekuensi", "frek", "freq"),
    unitPrice: find("harga satuan", "harga", "harga/unit"),
    total: find("total", "jumlah harga", "subtotal"),
  };
  if (col.unit === -1 && col.quantity !== -1 && header[col.quantity + 1] === "") {
    col.unit = col.quantity + 1;
  }

  const title =
    rows
      .slice(0, headerIndex)
      .flat()
      .map((c) => c.trim())
      .find(Boolean) ?? "";

  const items = [];
  for (const row of rows.slice(headerIndex + 1)) {
    const cell = (i) => (i === -1 ? "" : String(row[i] ?? "").trim());
    if (/^(sub\s*)?total/i.test(cell(0)) || /^(sub\s*)?total/i.test(cell(col.description))) {
      break;
    }
    const description = cell(col.description);
    if (!description) continue;

    const quantity = parseNumber(cell(col.quantity)) || 1;
    const frequency = parseNumber(cell(col.frequency)) || 1;
    let unitPrice = parseNumber(cell(col.unitPrice));
    if (unitPrice == null) {
      const total = parseNumber(cell(col.total));
      unitPrice = total != null ? total / (quantity * frequency) : 0;
    }

    items.push({
      description,
      quantity: Math.abs(quantity),
      unit: cell(col.unit) || null,
      frequency: Math.abs(frequency),
      unit_price: Math.max(0, Math.round(unitPrice * 100) / 100),
    });
  }

  if (!items.length) {
    throw new Error("Tidak ada baris RAB yang terbaca dari spreadsheet.");
  }
  return { title, items };
}

// Nilai khusus di dropdown pos RAB untuk pengeluaran tak terduga.
export const OUTSIDE_RAB = "__outside__";

// Rincian (pos RAB / kategori) satu kwitansi, urut sesuai input. Kwitansi
// yang dimuat tanpa receipt_lines (data sebelum migration 0024) dianggap satu
// rincian dari kolom lamanya.
export function receiptLines(receipt) {
  if (receipt.receipt_lines?.length) {
    return [...receipt.receipt_lines].sort((a, b) => a.position - b.position);
  }
  return [
    {
      id: `${receipt.id}-legacy`,
      rab_item_id: receipt.rab_item_id ?? null,
      outside_rab: Boolean(receipt.outside_rab),
      category: receipt.category ?? null,
      amount: receipt.amount,
      quantity: receipt.quantity ?? 1,
      notes: receipt.outside_rab || receipt.category ? receipt.notes : null,
    },
  ];
}

// Semua rincian dari daftar kwitansi, masing-masing membawa info kwitansinya
// (vendor, tanggal) untuk ditampilkan.
export function flattenReceiptLines(receipts) {
  return (receipts ?? []).flatMap((r) =>
    receiptLines(r).map((line) => ({
      ...line,
      receipt: r,
      vendor: r.vendor,
      receipt_date: r.receipt_date,
      created_at: r.created_at,
    }))
  );
}

// Bandingkan bukti (kwitansi) dengan RAB per RINCIAN kwitansi: realisasi &
// sisa per pos, pengeluaran di luar RAB, dan rincian yang belum ditandai ke
// pos mana pun. Sisa > 0 = dana tersisa, sisa < 0 = melebihi anggaran.
export function compareRab(items, receipts) {
  const byItem = new Map(items.map((it) => [it.id, []]));
  const outside = [];
  const unassigned = [];
  for (const line of flattenReceiptLines(receipts)) {
    if (line.outside_rab) outside.push(line);
    else (byItem.get(line.rab_item_id) ?? unassigned).push(line);
  }
  const sum = (rows) => rows.reduce((acc, r) => acc + Number(r.amount || 0), 0);
  const sumQty = (rows) => rows.reduce((acc, r) => acc + Number(r.quantity ?? 1), 0);

  const rows = items.map((item) => {
    const lines = byItem.get(item.id);
    const realized = sum(lines);
    const usedVolume = sumQty(lines);
    return {
      item,
      lines,
      receiptCount: new Set(lines.map((l) => l.receipt.id)).size,
      volume: rabItemVolume(item),
      usedVolume,
      avgPrice: usedVolume > 0 ? realized / usedVolume : null,
      budget: Number(item.total),
      realized,
      remaining: Number(item.total) - realized,
    };
  });
  const totalBudget = rows.reduce((acc, r) => acc + r.budget, 0);
  const totalRealized = sum(receipts ?? []);

  return {
    rows,
    outside,
    outsideTotal: sum(outside),
    // Kwitansi (utuh) yang masih punya rincian tanpa pos -- ditandai ulang
    // sebagai satu kesatuan dari kotak peringatan.
    unassigned: [...new Map(unassigned.map((l) => [l.receipt.id, l.receipt])).values()],
    unassignedTotal: sum(unassigned),
    totalBudget,
    totalRealized,
    totalRemaining: totalBudget - totalRealized,
  };
}

// Label alokasi satu kwitansi, mis. "BBM Rp200.000 + Konsumsi Rp50.000".
export function describeReceiptLines(receipt, { items = [], formatCurrency }) {
  const lines = receiptLines(receipt);
  const label = (l) =>
    l.outside_rab
      ? "Di luar RAB"
      : l.category ?? items.find((it) => it.id === l.rab_item_id)?.description ?? "Belum ditandai";
  if (lines.length === 1) return label(lines[0]);
  return lines.map((l) => `${label(l)} ${formatCurrency(l.amount)}`).join(" + ");
}
