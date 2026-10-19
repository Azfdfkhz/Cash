import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";
import { formatBankAccount, formatDate, FUNDING_SOURCE_LABEL } from "@/lib/utils";
import { compareRab, describeReceiptLines, flattenReceiptLines, formatVolume } from "@/lib/rab";

// Laporan penutupan Cash Advance (format mengikuti laporan manual tim):
// halaman 1 = ringkasan Ajuan vs Realisasi per pos, halaman berikutnya =
// lampiran foto/PDF bukti kwitansi, pengembalian, dan penggantian.

const PAGE = [841.89, 595.28]; // A4 landscape
const MARGIN = 48;
const BLACK = rgb(0, 0, 0);
const GREY = rgb(0.4, 0.4, 0.4);
const LINE = rgb(0.8, 0.8, 0.8);
const HIGHLIGHT = rgb(1, 0.95, 0.8);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

// "2026-09-19" -> "19-Sep-26"
function shortDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      year: "2-digit",
      month: "numeric",
      day: "2-digit",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value])
  );
  return `${parts.day}-${MONTHS[Number(parts.month) - 1]}-${parts.year}`;
}

function rupiahNumber(value) {
  const n = Math.round(Number(value) || 0);
  if (n === 0) return "-";
  const abs = Math.abs(n).toLocaleString("id-ID");
  return n < 0 ? `(${abs})` : abs;
}

function rupiahText(value) {
  return `Rp ${Math.round(Math.abs(Number(value) || 0)).toLocaleString("id-ID")}`;
}

// Font standar PDF (WinAnsi) tidak bisa menulis karakter di luar Latin-1.
function clean(text) {
  return String(text ?? "")
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "")
    .trim();
}

// Pecah teks jadi beberapa baris supaya muat di `maxWidth` (turun ke bawah,
// bukan dipotong "..."). Kata yang lebih panjang dari satu baris dipecah per
// huruf.
function wrap(font, text, size, maxWidth) {
  const words = clean(text).split(" ").filter(Boolean);
  if (!words.length) return [""];
  const lines = [];
  let line = "";
  const width = (t) => font.widthOfTextAtSize(t, size);
  for (let word of words) {
    while (width(word) > maxWidth) {
      // Kata kepanjangan: isi sisa baris sebanyak mungkin, lanjut di bawah.
      if (line) {
        lines.push(line);
        line = "";
      }
      let cut = word.length;
      while (cut > 1 && width(word.slice(0, cut)) > maxWidth) cut--;
      lines.push(word.slice(0, cut));
      word = word.slice(cut);
    }
    const candidate = line ? `${line} ${word}` : word;
    if (width(candidate) <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function earliest(dates) {
  const valid = dates.filter(Boolean).sort();
  return valid[0] ?? null;
}

// Reimbursement: tidak ada RAB -- satu baris per rincian kwitansi
// (kategori), Ajuan = Realisasi.
function buildReimbursementRows(receipts) {
  const rows = flattenReceiptLines(receipts).map((r) => ({
    date: r.receipt_date || r.created_at,
    description: [r.category, r.notes].filter(Boolean).join(": "),
    vendor: r.vendor,
    volume: formatVolume(r.quantity ?? 1),
    budget: Number(r.amount),
    realized: Number(r.amount),
    remaining: 0,
  }));
  const total = rows.reduce((s, r) => s + r.realized, 0);
  return {
    rows,
    cmp: { totalBudget: total, totalRealized: total, totalRemaining: 0 },
  };
}

function buildRows(items, receipts) {
  const cmp = compareRab(items, receipts);
  const vendors = (rs) => [...new Set(rs.map((r) => clean(r.vendor)).filter(Boolean))].join(", ");
  const rows = cmp.rows.map(({ item, lines: rs, budget, realized, remaining, volume, usedVolume }) => ({
    date: earliest(rs.map((r) => r.receipt_date || r.created_at)),
    description: item.description,
    vendor: vendors(rs),
    volume: `${formatVolume(usedVolume)}/${formatVolume(volume)} ${item.unit ?? ""}`,
    budget,
    realized,
    remaining,
  }));
  for (const r of cmp.outside) {
    rows.push({
      date: r.receipt_date || r.created_at,
      description: `Di luar RAB: ${r.notes ?? ""}`,
      vendor: r.vendor,
      volume: formatVolume(r.quantity ?? 1),
      budget: 0,
      realized: Number(r.amount),
      remaining: -Number(r.amount),
    });
  }
  for (const r of cmp.unassigned) {
    rows.push({
      date: r.receipt_date || r.created_at,
      description: "Belum ditandai pos RAB",
      vendor: r.vendor,
      volume: formatVolume(r.quantity ?? 1),
      budget: 0,
      realized: Number(r.amount),
      remaining: -Number(r.amount),
    });
  }
  return { rows, cmp };
}

async function toEmbeddable(buffer) {
  if (buffer.subarray(0, 4).toString() === "%PDF") return { kind: "pdf", buffer };
  // Normalisasi semua format foto (HEIC/WebP/PNG besar, rotasi EXIF) ke JPEG
  // kecil supaya ukuran laporan wajar.
  const jpeg = await sharp(buffer)
    .rotate()
    .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 72 })
    .toBuffer();
  return { kind: "image", buffer: jpeg };
}

export async function buildClosurePdf({
  ca,
  items,
  receipts,
  returns,
  reimbursements,
  approvedEvent,
  realizedAt,
  loadFile,
}) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const requesterName = clean(ca.profiles?.full_name);
  const isReimbursement = ca.kind === "reimbursement";
  const code = `${isReimbursement ? "RB" : "CA"}-${ca.id.slice(0, 8)}`;

  pdf.setTitle(`Laporan ${code} ${clean(ca.purpose)}`);
  pdf.setAuthor(requesterName);

  // ============ Halaman ringkasan ============
  let page = pdf.addPage(PAGE);
  let y = PAGE[1] - MARGIN;
  const width = PAGE[0] - MARGIN * 2;

  const text = (t, x, size, f = font, color = BLACK) =>
    page.drawText(clean(t), { x, y, size, font: f, color });

  text(`Ajuan ${formatDate(ca.created_at)}`, MARGIN, 16, bold);
  y -= 22;
  const source = [FUNDING_SOURCE_LABEL[ca.funding_source] ?? ca.funding_source, ca.program_ref]
    .filter(Boolean)
    .join(" ");
  const titleLines = wrap(
    font,
    `#${isReimbursement ? "Reimbursement" : "CA"} ${source ? `${source} : ` : ""}${ca.purpose} via ${requesterName}`,
    13,
    width
  );
  titleLines.forEach((line, i) => {
    if (i > 0) y -= 17;
    page.drawText(line, { x: MARGIN, y, size: 13, font });
  });
  y -= 22;
  text(`Realisasi ${formatDate(realizedAt)}`, MARGIN, 16, bold);
  y -= 14;
  text(code, MARGIN, 9, font, GREY);
  y -= 26;

  // Kolom: Tanggal | Uraian | Vendor | Volume | Ajuan | Realisasi | Sisa Dana
  const cols = [
    { key: "date", label: "Tanggal", w: 62 },
    { key: "description", label: "Uraian", w: 180 },
    { key: "vendor", label: "Vendor", w: 128 },
    { key: "volume", label: "Volume", w: 66 },
    { key: "budget", label: "Ajuan", w: 100, money: true },
    { key: "realized", label: "Realisasi", w: 100, money: true },
    { key: "remaining", label: "Sisa Dana", w: 100, money: true },
  ];
  let x0 = MARGIN;
  for (const c of cols) {
    c.x = x0;
    x0 += c.w;
  }
  const ROW = 18;
  const SIZE = 10;

  const drawHeader = () => {
    for (const c of cols) text(c.label, c.x + 2, SIZE, bold);
    y -= 6;
    page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + width, y }, thickness: 0.6, color: LINE });
    y -= ROW - 6;
  };

  const drawMoney = (c, value, f) => {
    page.drawText("Rp", { x: c.x + 2, y, size: SIZE, font: f });
    const v = rupiahNumber(value);
    const w = f.widthOfTextAtSize(v, SIZE);
    page.drawText(v, { x: c.x + c.w - 8 - w, y, size: SIZE, font: f });
  };

  drawHeader();
  const { rows, cmp } = isReimbursement
    ? buildReimbursementRows(receipts)
    : buildRows(items, receipts);
  const LINE_H = 12; // jarak antarbaris di dalam satu sel
  for (const row of rows) {
    // Teks panjang di Uraian / Vendor turun ke bawah; tinggi baris ikut.
    const cellLines = Object.fromEntries(
      cols
        .filter((c) => !c.money)
        .map((c) => [
          c.key,
          wrap(font, (c.key === "date" ? shortDate(row.date) : row[c.key]) || "-", SIZE, c.w - 6),
        ])
    );
    const lineCount = Math.max(...Object.values(cellLines).map((l) => l.length));
    const rowHeight = ROW + (lineCount - 1) * LINE_H;
    if (y - rowHeight < MARGIN + ROW * 3) {
      page = pdf.addPage(PAGE);
      y = PAGE[1] - MARGIN;
      drawHeader();
    }
    for (const c of cols) {
      if (c.money) drawMoney(c, row[c.key], font);
      else {
        cellLines[c.key].forEach((line, i) =>
          page.drawText(line, { x: c.x + 2, y: y - i * LINE_H, size: SIZE, font })
        );
      }
    }
    y -= rowHeight;
  }

  // Baris total; Sisa Dana disorot seperti laporan manual.
  const remainingCol = cols[6];
  page.drawRectangle({
    x: remainingCol.x,
    y: y - 5,
    width: remainingCol.w,
    height: ROW,
    color: HIGHLIGHT,
  });
  const totalLabel = "Total";
  page.drawText(totalLabel, {
    x: cols[1].x + (cols[1].w - bold.widthOfTextAtSize(totalLabel, SIZE)) / 2,
    y,
    size: SIZE,
    font: bold,
  });
  drawMoney(cols[4], cmp.totalBudget, bold);
  drawMoney(cols[5], cmp.totalRealized, bold);
  drawMoney(remainingCol, cmp.totalRemaining, bold);
  y -= ROW * 2;

  // Penyelesaian selisih.
  const totalReturned = (returns ?? [])
    .filter((r) => r.confirmed_at)
    .reduce((s, r) => s + Number(r.amount), 0);
  const totalReimbursed = (reimbursements ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const notes = [];
  if (isReimbursement) {
    notes.push("Reimbursement: uang pribadi requester diganti sesuai total kwitansi.");
  } else if (cmp.totalRemaining > 0) {
    notes.push(`Sisa dana dikembalikan requester ke perusahaan: ${rupiahText(totalReturned)} dari ${rupiahText(cmp.totalRemaining)}`);
  } else if (cmp.totalRemaining < 0) {
    notes.push(`Kelebihan belanja diganti perusahaan ke requester: ${rupiahText(totalReimbursed)} dari ${rupiahText(cmp.totalRemaining)}`);
  } else {
    notes.push("Realisasi sama dengan ajuan, tidak ada sisa maupun kekurangan dana.");
  }
  if (approvedEvent) {
    notes.push(
      `Disetujui oleh ${clean(approvedEvent.profiles?.full_name) || "-"} pada ${formatDate(approvedEvent.created_at)}`
    );
  }
  const bankAccount = clean(
    formatBankAccount({
      bankName: ca.bank_name,
      bankAccountNumber: ca.bank_account_number,
      bankAccountHolder: ca.bank_account_holder,
    })
  );
  if (ca.disbursed_at) {
    notes.push(
      `${isReimbursement ? "Reimbursement ditransfer" : "Dana dicairkan"} ${formatDate(ca.disbursed_at)} oleh ${clean(ca.disburser?.full_name) || "-"} ke ${bankAccount}`
    );
  } else if (ca.bank_name || ca.bank_account_number) {
    notes.push(`Rekening requester: ${bankAccount}`);
  }
  for (const n of notes) {
    for (const line of wrap(font, n, 9, width)) {
      if (y < MARGIN) {
        page = pdf.addPage(PAGE);
        y = PAGE[1] - MARGIN;
      }
      page.drawText(line, { x: MARGIN, y, size: 9, font, color: GREY });
      y -= 12;
    }
    y -= 1;
  }

  // ============ Lampiran bukti ============
  const attachments = [
    ...(ca.disbursement_proof_drive_file_id
      ? [
          {
            fileId: ca.disbursement_proof_drive_file_id,
            caption: `${shortDate(ca.disbursed_at)} - ${
              isReimbursement ? "Transfer reimbursement" : "Pencairan dana"
            } ke requester`,
            sub: `${rupiahText(ca.amount_requested)} - ${bankAccount}`,
          },
        ]
      : []),
    ...receipts.map((r) => ({
      fileId: r.drive_file_id,
      caption: `${shortDate(r.receipt_date || r.created_at)} - ${r.vendor || "Kwitansi"}`,
      // Mis. "Rp 250.000 - BBM Rp 200.000 + Konsumsi Rp 50.000".
      sub: `${rupiahText(r.amount)} - ${describeReceiptLines(r, {
        items,
        formatCurrency: rupiahText,
      })}`,
    })),
    ...(returns ?? []).map((r) => ({
      fileId: r.proof_drive_file_id,
      caption: `${shortDate(r.created_at)} - Pengembalian sisa dana`,
      sub: `${rupiahText(r.amount)} - ${r.confirmed_at ? "Terkonfirmasi" : "Belum dikonfirmasi"}`,
    })),
    ...(reimbursements ?? []).map((r) => ({
      fileId: r.proof_drive_file_id,
      caption: `${shortDate(r.created_at)} - Penggantian kelebihan belanja`,
      sub: `${rupiahText(r.amount)}${r.note ? ` - ${r.note}` : ""}`,
    })),
  ].filter((a) => a.fileId);

  // Unduh paralel (maks. 4 sekaligus); file yang gagal tetap dapat kotak
  // keterangan supaya kelihatan ada bukti yang tidak termuat.
  const loaded = new Array(attachments.length);
  for (let i = 0; i < attachments.length; i += 4) {
    await Promise.all(
      attachments.slice(i, i + 4).map(async (a, j) => {
        try {
          loaded[i + j] = await toEmbeddable(await loadFile(a.fileId));
        } catch (err) {
          console.error("Report attachment failed", a.fileId, err);
          loaded[i + j] = null;
        }
      })
    );
  }

  // Satu sel per gambar / per halaman PDF bukti (maks. 4 halaman per file).
  const cells = [];
  for (let i = 0; i < attachments.length; i++) {
    const a = attachments[i];
    const file = loaded[i];
    if (!file) {
      cells.push({ ...a, missing: true });
    } else if (file.kind === "image") {
      cells.push({ ...a, image: await pdf.embedJpg(file.buffer) });
    } else {
      try {
        const src = await PDFDocument.load(file.buffer, { ignoreEncryption: true });
        const count = Math.min(src.getPageCount(), 4);
        const embedded = await pdf.embedPdf(file.buffer, [...Array(count).keys()]);
        embedded.forEach((p, k) =>
          cells.push({ ...a, pdfPage: p, sub: count > 1 ? `${a.sub} (hal. ${k + 1})` : a.sub })
        );
      } catch (err) {
        console.error("Report PDF attachment failed", a.fileId, err);
        cells.push({ ...a, missing: true });
      }
    }
  }

  const PER_PAGE = 3;
  const GAP = 16;
  const cellW = (width - GAP * (PER_PAGE - 1)) / PER_PAGE;
  const cellTop = PAGE[1] - MARGIN - 18;
  const CAP_LH = 11; // keterangan (tebal, 9pt)
  const SUB_LH = 10; // sub-keterangan (8pt)
  // Keterangan lampiran turun ke bawah (tidak dipotong); tinggi area gambar
  // di satu halaman menyesuaikan keterangan terpanjang di halaman itu.
  const captionOf = (cell) => ({
    caption: wrap(bold, cell.caption, 9, cellW),
    sub: cell.sub ? wrap(font, cell.sub, 8, cellW) : [],
  });
  const captionHeight = (c) => c.caption.length * CAP_LH + c.sub.length * SUB_LH;
  let cellH = 0;

  for (let i = 0; i < cells.length; i++) {
    if (i % PER_PAGE === 0) {
      const onPage = cells.slice(i, i + PER_PAGE).map(captionOf);
      cellH = cellTop - MARGIN - 8 - Math.max(...onPage.map(captionHeight));
      page = pdf.addPage(PAGE);
      page.drawText(i === 0 ? "Lampiran Bukti" : "Lampiran Bukti (lanjutan)", {
        x: MARGIN,
        y: PAGE[1] - MARGIN,
        size: 11,
        font: bold,
      });
    }
    const cell = cells[i];
    const x = MARGIN + (i % PER_PAGE) * (cellW + GAP);
    const src = cell.image ?? cell.pdfPage;
    if (src) {
      const scale = Math.min(cellW / src.width, cellH / src.height);
      const w = src.width * scale;
      const h = src.height * scale;
      const opts = { x: x + (cellW - w) / 2, y: cellTop - h, width: w, height: h };
      if (cell.image) page.drawImage(cell.image, opts);
      else page.drawPage(cell.pdfPage, opts);
      page.drawRectangle({ ...opts, borderColor: LINE, borderWidth: 0.6 });
    } else {
      page.drawRectangle({ x, y: cellTop - cellH, width: cellW, height: cellH, borderColor: LINE, borderWidth: 1 });
      page.drawText("Bukti tidak bisa dimuat", { x: x + 10, y: cellTop - 20, size: 9, font, color: GREY });
    }
    // Keterangan mulai tepat di bawah area gambar, turun ke bawah.
    const cap = captionOf(cell);
    let ty = cellTop - cellH - 4 - 9;
    for (const line of cap.caption) {
      page.drawText(line, { x, y: ty, size: 9, font: bold });
      ty -= CAP_LH;
    }
    for (const line of cap.sub) {
      page.drawText(line, { x, y: ty, size: 8, font, color: GREY });
      ty -= SUB_LH;
    }
  }

  return pdf.save();
}
