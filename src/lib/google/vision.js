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

const AMOUNT_KEYWORDS = [
  "total",
  "grand total",
  "total bayar",
  "total belanja",
  "jumlah",
  "amount due",
  "total harga",
];

function parseAmountFromLine(line) {
  const match = line.match(/(?:rp\.?\s*)?([\d.,]{4,})/i);
  if (!match) return null;
  const raw = match[1].replace(/[^\d.,]/g, "");
  // Indonesian format uses "." as thousands separator, "," for decimals.
  const normalized = raw.replace(/\./g, "").replace(/,\d{1,2}$/, "");
  const value = parseInt(normalized.replace(/,/g, ""), 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function parseReceiptFields(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let amount = null;
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (AMOUNT_KEYWORDS.some((kw) => lower.includes(kw))) {
      const parsed = parseAmountFromLine(line);
      if (parsed) {
        amount = parsed;
        break;
      }
    }
  }

  if (!amount) {
    // fallback: largest "Rp"-prefixed number anywhere in the receipt
    const candidates = lines
      .filter((l) => /rp\.?\s*[\d.,]+/i.test(l))
      .map(parseAmountFromLine)
      .filter(Boolean);
    if (candidates.length) amount = Math.max(...candidates);
  }

  let receiptDate = null;
  const dateMatch = text.match(
    /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/
  );
  if (dateMatch) {
    let [, d, m, y] = dateMatch;
    if (y.length === 2) y = `20${y}`;
    const iso = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    if (!Number.isNaN(new Date(iso).getTime())) receiptDate = iso;
  }

  const vendor = lines[0] || "";

  return { amount, vendor, receiptDate, rawText: text };
}
