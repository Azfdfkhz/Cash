"use client";

import { useEffect, useState } from "react";
import { Check, FileText, Info, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PopupShell from "@/components/PopupShell";
import ReturnsSection from "@/components/ReturnsSection";
import { LocalFilePreview } from "@/components/FilePreview";
import { formatCaCode, formatCurrency, formatDate } from "@/lib/utils";

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-900">{children}</span>
    </div>
  );
}

// Status setelah bukti pengembalian terkirim, tampil di pop up yang sama
// (bukan halaman baru). Dua kolom (rincian | pratinjau) hanya bila pop up
// cukup lebar; selain itu menumpuk ke bawah.
function ReturnStatus({ ca, sent, onBackToDetail, onClose }) {
  const sizeMb = sent.file ? (sent.file.size / (1024 * 1024)).toFixed(1) : null;
  return (
    <div className="@container space-y-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Check size={20} strokeWidth={3} />
        </span>
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-900">Bukti Berhasil Terkirim</h4>
          <p className="text-xs text-slate-500">
            Diteruskan ke Tim Operasional &amp; Keuangan untuk verifikasi.
          </p>
        </div>
      </div>

      <div className="grid gap-4 @xl:grid-cols-2 @xl:items-start">
        <div className="min-w-0 space-y-3">
          <div className="rounded-xl border border-slate-200 px-4 py-3">
            <div className="mb-1 flex items-center justify-between gap-2 border-b border-dashed border-slate-200 pb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                Rincian Pengembalian
              </p>
              <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                Menunggu Verifikasi
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              <Row label="Jumlah Dikembalikan">{formatCurrency(sent.amount)}</Row>
              <Row label="Metode">Transfer Bank</Row>
              <Row label="Tanggal Kirim">{formatDate(sent.submittedAt)}</Row>
              <Row label="Pengajuan">{formatCaCode(ca)}</Row>
              {sent.note && <Row label="Catatan">{sent.note}</Row>}
            </div>
            {sent.file && (
              <div className="mt-2 flex items-center gap-2.5 rounded-xl border border-slate-200 p-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <FileText size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-900">{sent.file.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {sizeMb} MB · Tersimpan di Google Drive
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-600">
            <Info size={14} className="mt-0.5 shrink-0 text-blue-600" />
            Tim Keuangan akan memverifikasi bukti ini. Notifikasi konfirmasi dikirim
            setelah pengembalian dikonfirmasi.
          </div>
        </div>

        {sent.file && (
          <div className="min-w-0 rounded-xl bg-slate-100 p-3">
            <p className="mb-2 text-xs font-bold text-slate-900">Pratinjau Bukti Transfer</p>
            <LocalFilePreview file={sent.file} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
        >
          Tutup
        </button>
        <button
          type="button"
          onClick={onBackToDetail}
          className="rounded-full bg-[#0f172a] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
        >
          Kembali ke Detail Pengajuan
        </button>
      </div>
    </div>
  );
}

// "Kembalikan sisa" sebagai pop up tersendiri: hanya soal pengembalian sisa
// saldo (rekening tujuan, nominal, bukti transfer, riwayat pengembalian),
// terpisah dari pop up "Lihat Detail" yang memuat seluruh rincian pengajuan.
export default function ReturnPopup({ ca, onClose, currentUserId, onOpenDetail }) {
  const [data, setData] = useState(null);
  const [sent, setSent] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const rel = (table) =>
      supabase
        .from(table)
        .select("*")
        .eq("cash_advance_id", ca.id)
        .order("created_at", { ascending: false });
    Promise.all([
      supabase
        .from("cash_advances")
        .select("*")
        .eq("id", ca.id)
        .maybeSingle(),
      supabase
        .from("cash_advance_balances")
        .select("balance, total_spent, total_returned, total_reimbursed")
        .eq("cash_advance_id", ca.id)
        .maybeSingle(),
      rel("cash_advance_returns"),
      rel("cash_advance_reimbursements"),
    ]).then(([full, bal, returns, reimb]) => {
      if (cancelled) return;
      setData({
        forCa: ca,
        full: full.data,
        balanceRow: bal.data,
        returns: returns.data ?? [],
        reimbursements: reimb.data ?? [],
      });
    });
    return () => {
      cancelled = true;
    };
  }, [ca]);

  const loaded = data !== null && data.forCa === ca;
  const c = loaded && data.full ? data.full : ca;
  const balanceRow = data?.balanceRow;
  const balance = balanceRow?.balance ?? c.amount_requested;
  const totalSpent = balanceRow?.total_spent ?? 0;
  const totalReturned = balanceRow?.total_returned ?? 0;
  const totalReimbursed = balanceRow?.total_reimbursed ?? 0;
  const isOwner = c.requester_id === currentUserId;

  return (
    <PopupShell
      label="Kembalikan sisa saldo"
      title={sent ? "Status Pengembalian" : "Kembalikan Sisa Saldo"}
      badge={
        <span className="rounded bg-[#eff6ff] px-1.5 py-0.5 text-[10px] font-bold text-[#2563eb]">
          {formatCaCode(c)}
        </span>
      }
      subtitle={c.purpose}
      onClose={onClose}
      maxWidth={sent ? "max-w-3xl" : "max-w-xl"}
      closeOnBackdrop={false}
    >
      {sent ? (
        <ReturnStatus ca={c} sent={sent} onClose={onClose} onBackToDetail={onOpenDetail ?? onClose} />
      ) : (
      <div className="space-y-5">
        {!loaded ? (
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 size={14} className="animate-spin" /> Memuat data pengembalian...
          </p>
        ) : (
          <ReturnsSection
          disbursed={Boolean(c.disbursed_at)}
            cashAdvanceId={c.id}
            kind={c.kind}
            reportUrl={c.report_drive_url}
            bankName={c.bank_name}
            bankAccountNumber={c.bank_account_number}
            bankAccountHolder={c.bank_account_holder}
            status={c.status}
            isOwner={isOwner}
            isOperational={false}
            balance={balance}
            totalReturned={totalReturned}
            returns={data.returns}
            amountRequested={c.amount_requested}
            totalSpent={totalSpent}
            totalReimbursed={totalReimbursed}
            reimbursements={data.reimbursements}
            onReturnSubmitted={setSent}
          />
        )}
      </div>
      )}
    </PopupShell>
  );
}
