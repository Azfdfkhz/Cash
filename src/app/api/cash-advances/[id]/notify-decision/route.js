import { NextResponse } from "next/server";
import { createClient, getUserProfile } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import {
  sendTelegramMessage,
  buildApprovalMessage,
  buildRejectionMessage,
} from "@/lib/telegram/send";

export async function POST(request, { params }) {
  const { id } = await params;
  const { profile } = await getUserProfile();

  if (!profile || profile.role !== "operational") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: ca } = await supabase
    .from("cash_advances")
    .select(
      "purpose, amount_requested, status, review_note, bank_name, bank_account_number, profiles:requester_id(telegram_chat_id)"
    )
    .eq("id", id)
    .single();

  if (!ca || (ca.status !== "approved" && ca.status !== "rejected")) {
    return NextResponse.json({ error: "Pengajuan tidak valid." }, { status: 404 });
  }

  const chatId = ca.profiles?.telegram_chat_id;
  if (!chatId) {
    return NextResponse.json({ ok: true, skipped: "no_telegram_chat_id" });
  }

  try {
    const text =
      ca.status === "approved"
        ? buildApprovalMessage({
            purpose: ca.purpose,
            amount: ca.amount_requested,
            bankName: ca.bank_name,
            bankAccountNumber: ca.bank_account_number,
            formatCurrency,
          })
        : buildRejectionMessage({
            purpose: ca.purpose,
            amount: ca.amount_requested,
            note: ca.review_note,
            formatCurrency,
          });
    await sendTelegramMessage(chatId, text);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram notify failed", err);
    return NextResponse.json(
      { error: "Gagal mengirim notifikasi Telegram." },
      { status: 500 }
    );
  }
}
