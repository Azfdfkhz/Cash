"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { compareRab, formatVolume, OUTSIDE_RAB, receiptLines } from "@/lib/rab";

function remainingClass(value) {
  if (value < 0) return "text-rose-600";
  if (value > 0) return "text-amber-600";
  return "text-emerald-600";
}

export default function RabComparison({ items, receipts, canAssign }) {
  const router = useRouter();
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const result = compareRab(items, receipts);

  // Tandai SELURUH kwitansi (satu rincian) ke satu pos / di luar RAB.
  // Untuk membagi ke beberapa pos, pakai Edit di kartu kwitansi.
  async function assign(receipt, rabItemId, reason) {
    setError("");
    setSavingId(receipt.id);
    const supabase = createClient();
    const outside = rabItemId === OUTSIDE_RAB;
    const quantity = receiptLines(receipt).reduce(
      (s, l) => s + Number(l.quantity ?? 1),
      0
    );
    const { error } = await supabase.rpc("save_receipt", {
      target_id: receipt.id,
      ca_id: receipt.cash_advance_id,
      receipt: {
        amount: Number(receipt.amount),
        vendor: receipt.vendor,
        receipt_date: receipt.receipt_date,
        notes: outside ? "" : receipt.notes,
      },
      lines: [
        {
          rab_item_id: outside ? null : rabItemId,
          outside_rab: outside,
          amount: Number(receipt.amount),
          quantity: quantity || 1,
          notes: outside ? reason : null,
        },
      ],
    });
    setSavingId(null);
    if (error) {
      setError(error.message || "Gagal menandai pos RAB.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Perbandingan bukti (kwitansi) terhadap RAB yang diajukan.
      </p>

      {error && (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="divide-y divide-slate-100">
        {result.rows.map(({ item, receiptCount, budget, realized, remaining, volume, usedVolume, avgPrice }, index) => {
          const pct = budget > 0 ? Math.min(100, (realized / budget) * 100) : 0;
          return (
            <div key={item.id} className="py-2.5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-slate-900 min-w-0">
                  {index + 1}. {item.description}
                </p>
                <span className="text-xs text-slate-500 shrink-0">
                  {receiptCount} bukti
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    remaining < 0 ? "bg-rose-500" : "bg-brand"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <div>
                  <p className="text-slate-500">RAB</p>
                  <p className="font-medium text-slate-900">{formatCurrency(budget)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Realisasi</p>
                  <p className="font-medium text-slate-900">{formatCurrency(realized)}</p>
                </div>
                <div className="text-right">
                  <p className="text-slate-500">Sisa</p>
                  <p className={`font-semibold ${remainingClass(remaining)}`}>
                    {formatCurrency(remaining)}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                <span className={usedVolume > volume ? "text-rose-600 font-medium" : ""}>
                  Volume {formatVolume(usedVolume)} / {formatVolume(volume)} {item.unit ?? ""}
                  {usedVolume > volume ? " (melebihi RAB)" : ""}
                </span>
                {avgPrice != null && (
                  <>
                    {" · "}harga rata-rata {formatCurrency(avgPrice)}{" "}
                    <span
                      className={
                        avgPrice > Number(item.unit_price) ? "text-rose-600" : ""
                      }
                    >
                      (RAB {formatCurrency(item.unit_price)})
                    </span>
                  </>
                )}
              </p>
            </div>
          );
        })}
      </div>

      {result.outside.length > 0 && (
        <div className="rounded-lg border border-slate-200 p-3 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-slate-900">
              Di luar RAB (tak terduga)
            </p>
            <span className="text-xs text-slate-500 shrink-0">
              {result.outside.length} rincian
            </span>
          </div>
          {result.outside.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 text-xs">
              <div className="min-w-0">
                <p className="text-slate-900 truncate">
                  {r.vendor || "Kwitansi"} · {formatDate(r.receipt_date || r.created_at)}
                </p>
                <p className="text-slate-500">
                  Volume {formatVolume(r.quantity ?? 1)} · Alasan: {r.notes}
                </p>
              </div>
              <p className="font-medium text-slate-900 shrink-0">
                {formatCurrency(r.amount)}
              </p>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-100 pt-2 text-xs">
            <span className="text-slate-500">Total di luar RAB</span>
            <span className="font-semibold text-rose-600">
              {formatCurrency(result.outsideTotal)}
            </span>
          </div>
        </div>
      )}

      {result.unassigned.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-xs font-medium text-amber-800 flex items-center gap-1.5">
            <AlertTriangle size={14} />
            {result.unassigned.length} kwitansi belum ditandai ke pos RAB (
            {formatCurrency(result.unassignedTotal)})
          </p>
          {result.unassigned.map((r) => (
            <UnassignedReceipt
              key={r.id}
              receipt={r}
              items={items}
              canAssign={canAssign}
              saving={savingId === r.id}
              onAssign={assign}
            />
          ))}
        </div>
      )}

      <div className="rounded-lg bg-slate-50 px-3 py-2 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-600">Total RAB</span>
          <span className="font-medium text-slate-900">
            {formatCurrency(result.totalBudget)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Total Realisasi (bukti)</span>
          <span className="font-medium text-slate-900">
            {formatCurrency(result.totalRealized)}
          </span>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-1">
          <span className="text-slate-700 font-medium">
            {result.totalRemaining < 0 ? "Kelebihan Belanja" : "Sisa Dana"}
          </span>
          <span className={`font-semibold ${remainingClass(result.totalRemaining)}`}>
            {formatCurrency(Math.abs(result.totalRemaining))}
          </span>
        </div>
      </div>
    </div>
  );
}

function UnassignedReceipt({ receipt, items, canAssign, saving, onAssign }) {
  const [choosingOutside, setChoosingOutside] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-900 truncate">
            {receipt.vendor || "Kwitansi"} · {formatCurrency(receipt.amount)}
          </p>
          <p className="text-[11px] text-slate-500">
            {formatDate(receipt.receipt_date || receipt.created_at)}
          </p>
        </div>
        {canAssign && (
          <select
            value={choosingOutside ? OUTSIDE_RAB : ""}
            disabled={saving}
            onChange={(e) => {
              if (e.target.value === OUTSIDE_RAB) {
                setChoosingOutside(true);
                setReason(receipt.notes ?? "");
              } else {
                setChoosingOutside(false);
                onAssign(receipt, e.target.value);
              }
            }}
            className="shrink-0 max-w-[45%] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
          >
            <option value="" disabled>
              {saving ? "Menyimpan..." : "Pilih pos RAB"}
            </option>
            {items.map((item, index) => (
              <option key={item.id} value={item.id}>
                {index + 1}. {item.description}
              </option>
            ))}
            <option value={OUTSIDE_RAB}>Di luar RAB (tak terduga)</option>
          </select>
        )}
      </div>
      {choosingOutside && (
        <div className="flex gap-2">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Alasan pengeluaran di luar RAB"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
          />
          <button
            type="button"
            disabled={saving || !reason.trim()}
            onClick={() => onAssign(receipt, OUTSIDE_RAB, reason.trim())}
            className="shrink-0 rounded-lg bg-brand px-3 text-xs font-medium text-white disabled:opacity-60"
          >
            Simpan
          </button>
        </div>
      )}
    </div>
  );
}
