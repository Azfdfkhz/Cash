import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { sendTelegramMessage, buildNewRequestMessage } from "@/lib/telegram/send";

// Beri tahu grup Telegram Tim Operasional bahwa ada pengajuan masuk (baru
// atau diajukan ulang). Grup diatur lewat env TELEGRAM_OPS_CHAT_ID; kalau
// belum diisi, dilewati tanpa error.
export async function POST(request, { params }) {
  const { id } = await params;
  const chatId = process.env.TELEGRAM_OPS_CHAT_ID;
  if (!chatId) return NextResponse.json({ ok: true, skipped: "no_ops_chat_id" });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Hanya pemilik pengajuan yang memicu notifikasi ini, dan hanya selama
  // pengajuan memang sedang menunggu persetujuan.
  const { data: ca } = await supabase
    .from("cash_advances")
    .select("kind, status, purpose, amount_requested, requester_id, profiles:requester_id(full_name)")
    .eq("id", id)
    .single();
  if (!ca || ca.requester_id !== user.id || ca.status !== "pending") {
    return NextResponse.json({ error: "Pengajuan tidak valid." }, { status: 400 });
  }

  const { event, note } = await request.json().catch(() => ({}));
  try {
    await sendTelegramMessage(
      chatId,
      buildNewRequestMessage({
        kind: ca.kind,
        event: event === "resubmitted" ? "resubmitted" : "created",
        purpose: ca.purpose,
        amount: ca.amount_requested,
        requesterName: ca.profiles?.full_name,
        note,
        detailUrl: `${new URL(request.url).origin}/cash-advances/${id}`,
        formatCurrency,
      })
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram ops notify failed", err);
    return NextResponse.json({ error: "Gagal mengirim notifikasi grup." }, { status: 500 });
  }
}
