import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteDriveFile } from "@/lib/google/drive";
import { formatCurrency } from "@/lib/utils";
import { sendTelegramMessage, buildReopenMessage } from "@/lib/telegram/send";
import { checkRateLimit, isUuid, tooManyRequests } from "@/lib/security";

export const runtime = "nodejs";

// POST: Tim Operasional membatalkan "Selesai" untuk tinjau ulang.
// Urutan: hapus PDF laporan di Drive dulu (kalau gagal, tidak ada yang
// berubah), baru jalankan RPC yang membuka status & mengosongkan data laporan.
export async function POST(request, { params }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Pengajuan tidak valid." }, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await checkRateLimit(supabase, "reopen_ca", { max: 10, windowSeconds: 600 }))) {
    return tooManyRequests("Terlalu sering. Coba lagi beberapa menit lagi.", 120);
  }

  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
  if (reason.length < 3) {
    return NextResponse.json(
      { error: "Tulis alasan tinjau ulang supaya pemohon tahu apa yang harus diperbaiki." },
      { status: 400 }
    );
  }

  const [{ data: ca }, { data: profile }] = await Promise.all([
    supabase
      .from("cash_advances")
      .select("status, requester_id, report_drive_file_id, purpose, kind, amount_requested, profiles:requester_id(telegram_chat_id)")
      .eq("id", id)
      .single(),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
  ]);

  if (!ca) return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
  if (profile?.role !== "operational" || ca.requester_id === user.id) {
    return NextResponse.json(
      { error: "Hanya Tim Operasional (bukan pemilik pengajuan) yang bisa membatalkan selesai." },
      { status: 403 }
    );
  }
  if (ca.status !== "closed") {
    return NextResponse.json({ error: "Pengajuan ini belum selesai." }, { status: 400 });
  }

  try {
    if (ca.report_drive_file_id) {
      await deleteDriveFile(ca.report_drive_file_id);
    }
  } catch (err) {
    console.error("Delete report from Drive failed", err);
    return NextResponse.json(
      { error: "Gagal menghapus laporan di Drive. Status belum diubah, coba lagi." },
      { status: 502 }
    );
  }

  const { error } = await supabase.rpc("reopen_cash_advance", { target_id: id, reason });
  if (error) {
    return NextResponse.json({ error: error.message || "Gagal membuka kembali pengajuan." }, { status: 400 });
  }

  // Beri tahu pemohon lewat Telegram (kalau terhubung). Banner di aplikasi
  // tetap tampil walau notifikasi gagal.
  let notified = false;
  const chatId = ca.profiles?.telegram_chat_id;
  if (chatId) {
    try {
      await sendTelegramMessage(
        chatId,
        buildReopenMessage({
          purpose: ca.purpose,
          amount: ca.amount_requested,
          note: reason,
          detailUrl: `${new URL(request.url).origin}/dashboard?ca=${id}`,
          kind: ca.kind,
          formatCurrency,
        })
      );
      notified = true;
    } catch (err) {
      console.error("Telegram reopen notify failed", err);
    }
  }

  return NextResponse.json({ ok: true, notified });
}
