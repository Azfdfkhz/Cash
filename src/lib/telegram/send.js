function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendTelegramMessage(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  }
  if (!chatId) {
    throw new Error("chatId is required.");
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      // Batas Telegram 4096 karakter; sisakan ruang.
      text: String(text).slice(0, 4000),
      parse_mode: "HTML",
    }),
    // Telegram macet tidak boleh menahan fungsi serverless sampai timeout.
    signal: AbortSignal.timeout(8000),
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.description || "Gagal mengirim pesan Telegram.");
  }
  return data;
}

function kindLabel(kind) {
  return kind === "reimbursement" ? "Reimbursement" : "Cash Advance";
}

function accountLine(bankName, bankAccountNumber, bankAccountHolder) {
  const line = `${escapeHtml(bankName)} - ${escapeHtml(bankAccountNumber)}`;
  return bankAccountHolder ? `${line} a.n. ${escapeHtml(bankAccountHolder)}` : line;
}

export function buildApprovalMessage({
  purpose,
  amount,
  bankName,
  bankAccountNumber,
  bankAccountHolder,
  kind,
  formatCurrency,
}) {
  const lines = [
    `✅ <b>Pengajuan ${kindLabel(kind)} Disetujui</b>`,
    "",
    `Keperluan: ${escapeHtml(purpose)}`,
    `Nominal: ${escapeHtml(formatCurrency(amount))}`,
  ];

  if (bankName || bankAccountNumber) {
    lines.push(
      "",
      kind === "reimbursement"
        ? "Penggantian akan ditransfer ke rekening:"
        : "Dana akan dikirim ke rekening:",
      accountLine(bankName, bankAccountNumber, bankAccountHolder)
    );
  }

  return lines.join("\n");
}

export function buildRejectionMessage({ purpose, amount, note, reviseUrl, kind, formatCurrency }) {
  const lines = [
    `❌ <b>Pengajuan ${kindLabel(kind)} Ditolak</b>`,
    "",
    `Keperluan: ${escapeHtml(purpose)}`,
    `Nominal: ${escapeHtml(formatCurrency(amount))}`,
  ];

  if (note) {
    lines.push("", `Catatan: ${escapeHtml(note)}`);
  }

  lines.push(
    "",
    kind === "reimbursement"
      ? "Silakan perbaiki kwitansi lalu ajukan ulang di aplikasi."
      : "Silakan revisi RAB lalu ajukan ulang di aplikasi."
  );
  if (reviseUrl) {
    lines.push(`<a href="${escapeHtml(reviseUrl)}">Buka pengajuan</a>`);
  }

  return lines.join("\n");
}

export function buildReopenMessage({ purpose, amount, note, detailUrl, kind, formatCurrency }) {
  const lines = [
    `🔄 <b>${kindLabel(kind)} Dibuka Kembali untuk Tinjau Ulang</b>`,
    "",
    `Keperluan: ${escapeHtml(purpose)}`,
    `Nominal: ${escapeHtml(formatCurrency(amount))}`,
    "",
    "Tim Operasional membatalkan status Selesai karena ada data yang perlu dicek ulang.",
  ];
  if (note) lines.push("", `Catatan Tim Operasional: ${escapeHtml(note)}`);
  lines.push(
    "",
    "Silakan perbaiki kwitansi atau bukti pengembalian di aplikasi. Laporan lama sudah dihapus dan dibuat ulang saat pengajuan ditutup lagi."
  );
  if (detailUrl) lines.push(`<a href="${escapeHtml(detailUrl)}">Buka pengajuan</a>`);
  return lines.join("\n");
}

export function buildDisbursementMessage({
  purpose,
  amount,
  bankName,
  bankAccountNumber,
  bankAccountHolder,
  proofUrl,
  note,
  detailUrl,
  kind,
  formatCurrency,
}) {
  const isReimbursement = kind === "reimbursement";
  const lines = [
    isReimbursement
      ? "💸 <b>Reimbursement Sudah Ditransfer</b>"
      : "💸 <b>Dana Cash Advance Sudah Dicairkan</b>",
    "",
    `Keperluan: ${escapeHtml(purpose)}`,
    `Nominal: ${escapeHtml(formatCurrency(amount))}`,
    "",
    "Dana sudah ditransfer ke rekening Anda:",
    accountLine(bankName, bankAccountNumber, bankAccountHolder),
  ];

  if (note) {
    lines.push("", `Catatan: ${escapeHtml(note)}`);
  }
  if (proofUrl) {
    lines.push("", `<a href="${escapeHtml(proofUrl)}">Lihat bukti transfer</a>`);
  }
  lines.push(
    "",
    isReimbursement
      ? "✅ Reimbursement ini sudah selesai."
      : "Jangan lupa scan kwitansi setiap pengeluaran di aplikasi."
  );
  if (detailUrl) {
    lines.push(`<a href="${escapeHtml(detailUrl)}">Buka pengajuan</a>`);
  }

  return lines.join("\n");
}

export function buildReimbursementMessage({
  purpose,
  amount,
  bankName,
  bankAccountNumber,
  bankAccountHolder,
  proofUrl,
  note,
  remainingDeficit,
  closed,
  detailUrl,
  formatCurrency,
}) {
  const lines = [
    "💰 <b>Penggantian Kelebihan Belanja Sudah Ditransfer</b>",
    "",
    `Keperluan: ${escapeHtml(purpose)}`,
    `Nominal diganti: ${escapeHtml(formatCurrency(amount))}`,
  ];

  if (bankName || bankAccountNumber) {
    lines.push(
      "",
      "Ditransfer ke rekening Anda:",
      accountLine(bankName, bankAccountNumber, bankAccountHolder)
    );
  }
  if (note) {
    lines.push("", `Catatan: ${escapeHtml(note)}`);
  }
  if (proofUrl) {
    lines.push("", `<a href="${escapeHtml(proofUrl)}">Lihat bukti transfer</a>`);
  }

  lines.push(
    "",
    closed
      ? "✅ Seluruh kekurangan sudah diganti. Pengajuan ini sudah selesai."
      : `Sisa kekurangan yang belum diganti: ${escapeHtml(formatCurrency(remainingDeficit))}`
  );
  if (detailUrl) {
    lines.push(`<a href="${escapeHtml(detailUrl)}">Buka pengajuan</a>`);
  }

  return lines.join("\n");
}

// Username bot (mis. "DensusBot"), untuk ditampilkan di halaman Pengaturan.
// Di-cache sehari supaya tidak memanggil Telegram setiap buka halaman.
export async function getBotUsername() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    return data.ok ? data.result.username : null;
  } catch {
    return null;
  }
}

// Pesan ke grup Tim Operasional saat ada pengajuan masuk / diajukan ulang.
export function buildNewRequestMessage({
  kind,
  event,
  purpose,
  amount,
  requesterName,
  note,
  detailUrl,
  formatCurrency,
}) {
  const label = kindLabel(kind);
  const lines = [
    event === "resubmitted"
      ? `🔁 <b>${label} Diajukan Ulang</b>`
      : `📥 <b>Pengajuan ${label} Baru</b>`,
    "",
    `Dari: ${escapeHtml(requesterName)}`,
    `Keperluan: ${escapeHtml(purpose)}`,
    `Nominal: ${escapeHtml(formatCurrency(amount))}`,
  ];
  if (note) lines.push(`Catatan revisi: ${escapeHtml(note)}`);
  lines.push("", "Menunggu persetujuan Tim Operasional.");
  if (detailUrl) lines.push(`<a href="${escapeHtml(detailUrl)}">Buka pengajuan</a>`);
  return lines.join("\n");
}
