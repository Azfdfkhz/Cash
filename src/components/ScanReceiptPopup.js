"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PopupShell from "@/components/PopupShell";
import ScanForm from "@/components/ScanForm";
import { flattenReceiptLines, rabItemVolume } from "@/lib/rab";
import { formatCaCode, formatCurrency, KIND_LABEL } from "@/lib/utils";

// "Catat kwitansi" sebagai pop up (menggantikan halaman /cash-advances/[id]/scan
// supaya requester tidak pindah halaman). Data pos RAB & saldo dimuat di sini,
// sama seperti yang dulu dimuat di halaman scan.
//
// Perpindahan ke modal lain TIDAK dilakukan di sini: pop up ini hanya memanggil
// `onOpenReturn` / `onOpenDetail`, dan pemilik state modal (useModalState) yang
// menutup pop up ini lalu membuka modal tujuan. Jadi tidak pernah ada dua modal
// aktif sekaligus.
//   onSaved        -- kwitansi tersimpan (pemilik state menutup pop up + menampilkan hasil)
//   onOpenReturn   -- opsional, tombol "Kembalikan Sisa"
//   onOpenDetail   -- opsional, tombol "Lihat Detail"
export default function ScanReceiptPopup({ ca, onClose, onSaved, onOpenReturn, onOpenDetail }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [dirty, setDirty] = useState(false);
  // Pindah modal saat ada isian belum tersimpan: minta konfirmasi dulu.
  const [pendingLeave, setPendingLeave] = useState(null);
  const isReimbursement = ca.kind === "reimbursement";

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    Promise.all([
      supabase
        .from("rab_items")
        .select("id, description, unit, quantity, frequency")
        .eq("cash_advance_id", ca.id)
        .order("position"),
      supabase
        .from("receipts")
        .select("id, amount, rab_item_id, outside_rab, quantity, receipt_lines(*)")
        .eq("cash_advance_id", ca.id),
      supabase
        .from("cash_advance_balances")
        .select("balance")
        .eq("cash_advance_id", ca.id)
        .maybeSingle(),
    ]).then(([rab, receipts, bal]) => {
      if (cancelled) return;
      if (rab.error || receipts.error) setError("Sebagian data pos RAB gagal dimuat.");
      if (bal.error) setError("Sisa saldo gagal dimuat.");

      // Sisa volume per pos = volume RAB - volume kwitansi yang sudah ada.
      const lines = flattenReceiptLines(receipts.data ?? []);
      const items = (rab.data ?? []).map((item) => {
        const used = lines
          .filter((l) => l.rab_item_id === item.id)
          .reduce((sum, l) => sum + Number(l.quantity ?? 1), 0);
        const volume = rabItemVolume(item);
        return {
          id: item.id,
          description: item.description,
          unit: item.unit,
          volume,
          remainingVolume: Math.max(0, volume - used),
        };
      });
      setData({ items, balance: bal.data?.balance ?? ca.amount_requested ?? null });
    }).catch(() => {
      if (!cancelled) setLoadFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ca.id, ca.amount_requested]);

  function leaveTo(action) {
    if (dirty) setPendingLeave(() => action);
    else action();
  }

  const footer =
    onOpenReturn || onOpenDetail ? (
      pendingLeave ? (
        <div role="alertdialog" aria-label="Buang isian kwitansi?" className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-900">
            Kwitansi belum disimpan. Buang isian dan pindah?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPendingLeave(null)}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Lanjut mengisi
            </button>
            <button
              type="button"
              onClick={() => pendingLeave()}
              className="rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
            >
              Buang &amp; pindah
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {onOpenDetail && (
            <button
              type="button"
              onClick={() => leaveTo(onOpenDetail)}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Lihat Detail
            </button>
          )}
          {onOpenReturn && (
            <button
              type="button"
              onClick={() => leaveTo(onOpenReturn)}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Kembalikan Sisa
            </button>
          )}
        </div>
      )
    ) : null;

  return (
    <PopupShell
      label="Catat kwitansi"
      title="Catat Kwitansi / Bukti Transfer"
      badge={
        <>
          <span className="rounded bg-[#eff6ff] px-1.5 py-0.5 text-xs font-bold text-[#2563eb]">
            {formatCaCode(ca)}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-brand">
            {KIND_LABEL[ca.kind] ?? "Cash Advance"}
          </span>
        </>
      }
      subtitle={ca.purpose}
      headerRight={
        data?.balance != null && !isReimbursement ? (
          <div className="hidden rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs sm:block">
            <span className="text-slate-600">Sisa Saldo </span>
            <span className="font-bold text-slate-900">{formatCurrency(data.balance)}</span>
          </div>
        ) : null
      }
      onClose={onClose}
      footer={footer}
      // Berisi isian & file yang belum disimpan: tutup lewat tombol X saja.
      closeOnBackdrop={false}
    >
      {loadFailed ? (
        <p role="alert" className="py-6 text-sm font-semibold text-rose-700">
          Data pos RAB gagal dimuat. Tutup pop up ini lalu coba lagi.
        </p>
      ) : !data ? (
        <p className="flex items-center gap-2 py-6 text-xs text-slate-600">
          <Loader2 size={14} className="animate-spin" /> Memuat pos RAB...
        </p>
      ) : (
        <>
          {error && (
            <p role="alert" className="mb-3 text-xs font-semibold text-rose-700">
              {error}
            </p>
          )}
          <ScanForm
            cashAdvanceId={ca.id}
            rabItems={data.items}
            kind={ca.kind}
            balance={data.balance}
            embedded
            onDone={onSaved ?? onClose}
            onDirtyChange={setDirty}
          />
        </>
      )}
    </PopupShell>
  );
}
