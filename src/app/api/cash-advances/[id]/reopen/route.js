import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteDriveFile } from "@/lib/google/drive";
import { formatCurrency } from "@/lib/utils";
import { sendTelegramMessage, buildReopenMessage } from "@/lib/telegram/send";
import { checkRateLimit, isUuid, tooManyRequests } from "@/lib/security";

export const runtime = "nodejs";

// POST: Tim Operasional membatalkan "Selesai" untuk tinjau ulang.
// Mengikuti cash-advance-app: Ops memilih pengembalian mana yang konfirmasinya
// dibatalkan (unconfirmReturnIds). Urutan: jalankan RPC dulu (validasi pilihan
// pengembalian bisa menolak), baru hapus PDF laporan di Drive. Kalau hapus
// Drive gagal, status sudah benar dan file lama hanya jadi yatim (tidak dipakai).
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

  const unconfirmReturnIds = Array.isArray(body?.unconfirmReturnIds)
    ? [...new Set(body.unconfirmReturnIds)].slice(0, 100)
    : [];
  if (!unconfirmReturnIds.every(isUuid)) {
    return NextResponse.json({ error: "Pilihan pengembalian tidak valid." }, { status: 400 });
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

  if (ca.kind === "reimbursement") {
    return NextResponse.json({ error: "Reimbursement tidak bisa dibuka kembali." }, { status: 400 });
  }

  const { error } = await supabase.rpc("reopen_cash_advance", {
    target_id: id,
    note: reason,
    unconfirm_return_ids: unconfirmReturnIds,
  });
  if (error) {
    return NextResponse.json({ error: error.message || "Gagal membuka kembali pengajuan." }, { status: 400 });
  }

  // RPC sudah mengosongkan report_drive_*; hapus file PDF lamanya (best effort).
  if (ca.report_drive_file_id) {
    try {
      await deleteDriveFile(ca.report_drive_file_id);
    } catch (err) {
      console.error("Delete report from Drive failed", err);
    }
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
