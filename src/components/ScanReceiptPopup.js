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
export default function ScanReceiptPopup({ ca, onClose }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
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
    });
    return () => {
      cancelled = true;
    };
  }, [ca.id, ca.amount_requested]);

  return (
    <PopupShell
      label="Catat kwitansi"
      title="Catat Kwitansi / Bukti Transfer"
      badge={
        <>
          <span className="rounded bg-[#eff6ff] px-1.5 py-0.5 text-[10px] font-bold text-[#2563eb]">
            {formatCaCode(ca)}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-brand">
            {KIND_LABEL[ca.kind] ?? "Cash Advance"}
          </span>
        </>
      }
      subtitle={ca.purpose}
      headerRight={
        data?.balance != null && !isReimbursement ? (
          <div className="hidden rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs sm:block">
            <span className="text-slate-500">Sisa Saldo </span>
            <span className="font-bold text-slate-900">{formatCurrency(data.balance)}</span>
          </div>
        ) : null
      }
      onClose={onClose}
      // Berisi isian & file yang belum disimpan: tutup lewat tombol X saja.
      closeOnBackdrop={false}
    >
      {!data ? (
        <p className="flex items-center gap-2 py-6 text-xs text-slate-500">
          <Loader2 size={14} className="animate-spin" /> Memuat pos RAB...
        </p>
      ) : (
        <>
          {error && <p className="mb-3 text-xs text-rose-600">{error}</p>}
          <ScanForm
            cashAdvanceId={ca.id}
            rabItems={data.items}
            kind={ca.kind}
            balance={data.balance}
            embedded
            onDone={onClose}
          />
        </>
      )}
    </PopupShell>
  );
}
