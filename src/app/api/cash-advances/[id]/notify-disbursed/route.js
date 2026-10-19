import { NextResponse } from "next/server";
import { createClient, getUserProfile } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { sendTelegramMessage, buildDisbursementMessage } from "@/lib/telegram/send";

// Kirim notifikasi Telegram ke requester bahwa dana sudah dicairkan,
// dipanggil oleh Tim Operasional setelah mark_cash_advance_disbursed.
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
      "purpose, kind, amount_requested, bank_name, bank_account_number, bank_account_holder, disbursed_at, disbursement_proof_url, disbursement_note, profiles:requester_id(telegram_chat_id)"
    )
    .eq("id", id)
    .single();

  if (!ca || !ca.disbursed_at) {
    return NextResponse.json({ error: "Pengajuan belum dicairkan." }, { status: 404 });
  }

  const chatId = ca.profiles?.telegram_chat_id;
  if (!chatId) {
    return NextResponse.json({ ok: true, skipped: "no_telegram_chat_id" });
  }

  try {
    await sendTelegramMessage(
      chatId,
      buildDisbursementMessage({
        purpose: ca.purpose,
        amount: ca.amount_requested,
        bankName: ca.bank_name,
        bankAccountNumber: ca.bank_account_number,
        bankAccountHolder: ca.bank_account_holder,
        proofUrl: ca.disbursement_proof_url,
        note: ca.disbursement_note,
        detailUrl: `${new URL(request.url).origin}/cash-advances/${id}`,
        kind: ca.kind,
        formatCurrency,
      })
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram disbursement notify failed", err);
    return NextResponse.json(
      { error: "Gagal mengirim notifikasi Telegram." },
      { status: 500 }
    );
  }
}
