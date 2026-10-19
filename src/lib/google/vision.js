import { google } from "googleapis";
import { getGoogleAuth } from "./auth";

export async function extractReceiptText(base64Content, mimeType = "image/jpeg") {
  const auth = getGoogleAuth();
  const vision = google.vision({ version: "v1", auth });

  if (mimeType === "application/pdf") {
    // PDF tidak bisa lewat images.annotate -- pakai files.annotate (endpoint
    // dokumen). Kwitansi hampir selalu 1 halaman, dan sync files.annotate
    // dibatasi maks 5 halaman per panggilan, jadi cukup baca halaman 1.
    const res = await vision.files.annotate({
      requestBody: {
        requests: [
          {
            inputConfig: { mimeType, content: base64Content },
            features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
            pages: [1],
          },
        ],
      },
    });
    return res.data.responses?.[0]?.responses?.[0]?.fullTextAnnotation?.text ?? "";
  }

  const res = await vision.images.annotate({
    requestBody: {
      requests: [
        {
          image: { content: base64Content },
          features: [{ type: "TEXT_DETECTION" }],
        },
      ],
    },
  });

  return res.data.responses?.[0]?.fullTextAnnotation?.text ?? "";
}

// ============ Parser hasil OCR: kwitansi/struk & bukti transfer ============

// Label nominal, urut dari yang paling spesifik. Untuk bukti transfer, angka
// sering ada di baris SETELAH label ("Jumlah" -> "IDR 525,000.00").
const AMOUNT_KEYWORDS = [
  "total bayar",
  "total pembayaran",
  "total transfer",
  "jumlah transfer",
  "nominal transfer",
  "nominal top-up",
  "nominal top up",
  "nominal",
  "grand total",
  "total belanja",
  "total harga",
  "amount due",
  "total",
  "jumlah",
  "amount",
];

// Penanda bukti transfer / pembayaran digital (bukan struk toko).
const TRANSFER_HINTS = [
  "transfer",
  "transaksi berhasil",
  "pembayaran berhasil",
  "bukti transaksi",
  "rekening tujuan",
  "rekening sumber",
  "penerima",
  "top-up",
  "top up",
  "qris",
  "virtual account",
  "no. ref",
  "no ref",
  "referensi",
];

// Label nama penerima pada bukti transfer, nilai di baris yang sama
// (setelah ":") atau baris berikutnya.
const RECIPIENT_LABELS = [
  "nama penerima",
  "penerima",
  "transfer ke",
  "tujuan transfer",
  "rekening tujuan",
  "kepada",
  "merchant",
  "nama merchant",
  "to",
];

const MONTHS = {
  jan: 1, januari: 1, january: 1,
  feb: 2, februari: 2, february: 2, peb: 2,
  mar: 3, maret: 3, march: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6, june: 6,
  jul: 7, juli: 7, july: 7,
  agu: 8, agt: 8, ags: 8, agustus: 8, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  okt: 10, oct: 10, oktober: 10, october: 10,
  nov: 11, nopember: 11, november: 11,
  des: 12, dec: 12, desember: 12, december: 12,
};

// "Rp 1.000.000" / "IDR 525,000.00" / "Rp300.000,50" -> 1000000 / 525000 / 300000.
// Pemisah ribuan & desimal ditebak dari polanya (format Indonesia dan Inggris).
export function parseRupiah(raw) {
  let s = String(raw).replace(/[^\d.,]/g, "");
  if (!/\d/.test(s)) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    const dec = lastComma > lastDot ? "," : ".";
    s = s.split(dec === "," ? "." : ",").join("");
    s = s.replace(dec, ".");
  } else if (lastComma !== -1 || lastDot !== -1) {
    const sep = lastComma !== -1 ? "," : ".";
    const parts = s.split(sep);
    s = parts.length > 2 || parts[parts.length - 1].length === 3 ? parts.join("") : parts.join(".");
  }
  const value = Math.round(Number(s));
  return Number.isFinite(value) && value > 0 ? value : null;
}

// Angka uang di satu baris. Wajib ada Rp/IDR, ATAU (kalau `loose`) angka
// berpemisah ribuan -- supaya nomor rekening / no. referensi tidak terbaca
// sebagai nominal.
function amountInLine(line, { loose = false } = {}) {
  const withCurrency = line.match(/(?:rp|idr)\.?\s*([\d][\d.,]*)/i);
  if (withCurrency) return parseRupiah(withCurrency[1]);
  if (!loose) return null;
  const grouped = line.match(/\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?\b/);
  return grouped ? parseRupiah(grouped[0]) : null;
}

function parseDate(text) {
  // 19/09/2026, 19-09-26, 19.09.2026
  let m = text.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = `20${y}`;
    return toIso(y, mo, d);
  }
  // 2026-09-19
  m = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (m) return toIso(m[1], m[2], m[3]);
  // 19 Sep 2026, 19 September 2026, 19-Sep-26
  m = text.match(/\b(\d{1,2})[\s\-]+([a-z]{3,9})\.?[\s\-,]+(\d{2,4})\b/i);
  if (m && MONTHS[m[2].toLowerCase()]) {
    const y = m[3].length === 2 ? `20${m[3]}` : m[3];
    return toIso(y, MONTHS[m[2].toLowerCase()], m[1]);
  }
  return null;
}

function toIso(y, m, d) {
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.getUTCDate() !== Number(d) ? null : iso;
}

// Nama penerima: nilai setelah label -- label berdiri sendiri di satu baris
// (nilai di baris berikutnya) atau diikuti ":" (nilai di baris yang sama).
// Judul seperti "TRANSFER KE REKENING LAIN" bukan label, jadi dilewati.
// Baris berisi angka saja (no. rekening) dilewati.
function findRecipient(lines) {
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase().replace(/\s+/g, " ");
    const label = RECIPIENT_LABELS.find(
      (l) => lower === l || lower.startsWith(`${l}:`) || lower.startsWith(`${l} :`)
    );
    if (!label) continue;
    const sameLine = lines[i].slice(label.length).replace(/^[\s:]+/, "").trim();
    const candidates = [sameLine, lines[i + 1], lines[i + 2]].filter(Boolean);
    const name = candidates.find(
      (c) => /[a-z]{3,}/i.test(c) && !/^[\d\s*.\-]+(idr)?$/i.test(c) && !RECIPIENT_LABELS.includes(c.toLowerCase())
    );
    if (name) return name.replace(/\s+/g, " ").trim();
  }
  return null;
}

export function parseReceiptFields(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const lowerText = text.toLowerCase();
  const isTransfer = TRANSFER_HINTS.some((h) => lowerText.includes(h));

  // Nominal: baris berlabel (atau 1-2 baris setelahnya), dari label paling
  // spesifik; cadangan = angka Rp/IDR terbesar.
  let amount = null;
  outer: for (const kw of AMOUNT_KEYWORDS) {
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].toLowerCase().includes(kw)) continue;
      for (const line of [lines[i], lines[i + 1], lines[i + 2]].filter(Boolean)) {
        const value = amountInLine(line, { loose: true });
        if (value) {
          amount = value;
          break outer;
        }
      }
    }
  }
  if (!amount) {
    const candidates = lines.map((l) => amountInLine(l)).filter(Boolean);
    if (candidates.length) amount = Math.max(...candidates);
  }

  const receiptDate = parseDate(text);

  // Vendor: untuk bukti transfer = nama penerima; untuk struk = nama toko
  // (baris pertama).
  const recipient = isTransfer ? findRecipient(lines) : null;
  // Top-up dompet/kartu elektronik tidak punya "penerima": tulis tujuannya.
  const topUp = /top[\s-]?up/i.test(text)
    ? text.match(/\b(e-?money|gopay|ovo|dana|shopeepay|linkaja|flazz|brizzi|tapcash|jakcard)\b/i)?.[1]
    : null;
  const vendor = recipient || (topUp ? `Top-up ${topUp}` : null) || lines[0] || "";

  return {
    amount,
    vendor,
    receiptDate,
    documentType: isTransfer ? "transfer" : "receipt",
    rawText: text,
  };
}
