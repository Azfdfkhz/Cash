function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
      text,
      parse_mode: "HTML",
    }),
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.description || "Gagal mengirim pesan Telegram.");
  }
  return data;
}

export function buildApprovalMessage({ purpose, amount, bankName, bankAccountNumber, formatCurrency }) {
  const lines = [
    "✅ <b>Pengajuan Cash Advance Disetujui</b>",
    "",
    `Keperluan: ${escapeHtml(purpose)}`,
    `Nominal: ${escapeHtml(formatCurrency(amount))}`,
  ];

  if (bankName || bankAccountNumber) {
    lines.push(
      "",
      "Dana akan dikirim ke rekening:",
      `${escapeHtml(bankName)} - ${escapeHtml(bankAccountNumber)}`
    );
  }

  return lines.join("\n");
}

export function buildRejectionMessage({ purpose, amount, note, formatCurrency }) {
  const lines = [
    "❌ <b>Pengajuan Cash Advance Ditolak</b>",
    "",
    `Keperluan: ${escapeHtml(purpose)}`,
    `Nominal: ${escapeHtml(formatCurrency(amount))}`,
  ];

  if (note) {
    lines.push("", `Catatan: ${escapeHtml(note)}`);
  }

  return lines.join("\n");
}
