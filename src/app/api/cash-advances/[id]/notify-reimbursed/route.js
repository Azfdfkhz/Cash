import { NextResponse } from "next/server";
import { createClient, getUserProfile } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { sendTelegramMessage, buildReimbursementMessage } from "@/lib/telegram/send";
import { checkRateLimit, isUuid, tooManyRequests } from "@/lib/security";

// Kirim notifikasi Telegram ke requester bahwa Tim Operasional sudah
// mentransfer penggantian kelebihan belanja (beserta bukti transfernya).
export async function POST(request, { params }) {
  const { id } = await params;
  const { profile } = await getUserProfile();

  if (!profile || profile.role !== "operational") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reimbursementId } = await request.json().catch(() => ({}));
  if (!reimbursementId) {
    return NextResponse.json({ error: "reimbursementId wajib diisi." }, { status: 400 });
  }

  if (!isUuid(id) || !isUuid(reimbursementId)) {
    return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });
  }

  const supabase = await createClient();
  const allowed = await checkRateLimit(supabase, "notify_reimbursed", {
    max: 60,
    windowSeconds: 600,
    subject: reimbursementId,
    subjectMax: 2,
  });
  if (!allowed) return tooManyRequests("Notifikasi penggantian ini sudah dikirim.", 300);

  const [{ data: ca }, { data: reimbursement }] = await Promise.all([
    supabase
      .from("cash_advances")
      .select(
        "purpose, status, amount_requested, total_spent, total_reimbursed, bank_name, bank_account_number, bank_account_holder, profiles:requester_id(telegram_chat_id)"
      )
      .eq("id", id)
      .single(),
    supabase
      .from("cash_advance_reimbursements")
      .select("amount, note, proof_drive_view_url")
      .eq("id", reimbursementId)
      .eq("cash_advance_id", id)
      .single(),
  ]);

  if (!ca || !reimbursement) {
    return NextResponse.json({ error: "Penggantian tidak ditemukan." }, { status: 404 });
  }

  const chatId = ca.profiles?.telegram_chat_id;
  if (!chatId) {
    return NextResponse.json({ ok: true, skipped: "no_telegram_chat_id" });
  }

  const deficit =
    Number(ca.total_spent) - Number(ca.amount_requested) - Number(ca.total_reimbursed);

  try {
    await sendTelegramMessage(
      chatId,
      buildReimbursementMessage({
        purpose: ca.purpose,
        amount: reimbursement.amount,
        bankName: ca.bank_name,
        bankAccountNumber: ca.bank_account_number,
        bankAccountHolder: ca.bank_account_holder,
        proofUrl: reimbursement.proof_drive_view_url,
        note: reimbursement.note,
        remainingDeficit: Math.max(deficit, 0),
        closed: ca.status === "closed",
        detailUrl: `${new URL(request.url).origin}/cash-advances/${id}`,
        formatCurrency,
      })
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram reimbursement notify failed", err);
    return NextResponse.json(
      { error: "Gagal mengirim notifikasi Telegram." },
      { status: 500 }
    );
  }
}
