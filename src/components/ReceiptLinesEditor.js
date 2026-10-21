"use client";

import { Plus, Trash2 } from "lucide-react";
import CurrencyInput from "@/components/CurrencyInput";
import { formatCurrency, REIMBURSEMENT_CATEGORIES } from "@/lib/utils";
import { formatVolume, OUTSIDE_RAB, receiptLines } from "@/lib/rab";

// Rincian satu kwitansi: ke pos RAB mana (Cash Advance) atau kategori apa
// (Reimbursement) nominalnya dialokasikan. Default satu rincian = seluruh
// nominal kwitansi; "Bagi ke pos lain" untuk struk berisi item dari pos /
// kategori berbeda. Total rincian harus sama dengan nominal kwitansi.
//
// Bentuk baris (state): { key, pos, other, amount, quantity, notes }
//   pos   = id pos RAB | OUTSIDE_RAB (Cash Advance) atau nama kategori (Reimbursement)
//   other = isian manual kalau kategori "Lainnya"; disimpan sebagai
//           "Lainnya: <isian>" supaya tetap terbaca sebagai Lainnya di rekap.

const OTHER_CATEGORY = "Lainnya";
const OTHER_PREFIX = `${OTHER_CATEGORY}: `;

let keySeq = 0;
export function newLine(fields = {}) {
  return { key: `line-${++keySeq}`, pos: "", other: "", amount: "", quantity: "1", notes: "", ...fields };
}

function splitCategory(category) {
  if (category?.startsWith(OTHER_PREFIX)) {
    return { pos: OTHER_CATEGORY, other: category.slice(OTHER_PREFIX.length) };
  }
  return { pos: category ?? "", other: "" };
}

// Rincian tersimpan (receipt_lines) -> state editor.
export function linesFromReceipt(receipt, kind) {
  return receiptLines(receipt).map((l) =>
    newLine({
      ...(kind === "reimbursement"
        ? splitCategory(l.category)
        : { pos: l.outside_rab ? OUTSIDE_RAB : l.rab_item_id ?? "" }),
      amount: String(Math.round(Number(l.amount))),
      quantity: String(l.quantity ?? 1),
      notes: l.notes ?? "",
    })
  );
}

// Nominal tiap rincian; kalau cuma satu rincian, nominalnya = total kwitansi.
function effectiveAmount(lines, i, total) {
  return lines.length === 1 ? Number(total) || 0 : Number(lines[i].amount) || 0;
}

// Validasi + bentuk payload untuk RPC save_receipt / create_reimbursement.
// Melempar Error dengan pesan yang bisa ditampilkan ke user.
export function toLinesPayload(lines, { kind, total, requirePos }) {
  const isReimbursement = kind === "reimbursement";
  const payload = lines.map((line, i) => {
    const n = lines.length > 1 ? ` rincian ${i + 1}` : "";
    const amount = effectiveAmount(lines, i, total);
    const quantity = Number(line.quantity);
    const outside = !isReimbursement && line.pos === OUTSIDE_RAB;
    if (!(amount > 0)) throw new Error(`Nominal${n} harus lebih dari 0.`);
    if (!(quantity > 0)) throw new Error(`Volume${n} harus lebih dari 0.`);
    if (isReimbursement) {
      if (!line.pos) throw new Error(`Pilih kategori${n}.`);
      if (line.pos === OTHER_CATEGORY && !line.other.trim()) {
        throw new Error(`Sebutkan kategori Lainnya${n}.`);
      }
      if (!line.notes.trim()) throw new Error(`Isi catatan${n}.`);
    } else {
      if (requirePos && !line.pos) throw new Error(`Pilih pos RAB${n}.`);
      if (outside && !line.notes.trim()) throw new Error(`Isi alasan di luar RAB${n}.`);
    }
    return isReimbursement
      ? {
          category:
            line.pos === OTHER_CATEGORY ? `${OTHER_PREFIX}${line.other.trim()}` : line.pos,
          amount,
          quantity,
          notes: line.notes.trim(),
        }
      : {
          rab_item_id: outside ? null : line.pos || null,
          outside_rab: outside,
          amount,
          quantity,
          notes: line.notes.trim() || null,
        };
  });
  const sum = payload.reduce((s, l) => s + l.amount, 0);
  if (Math.round(sum * 100) !== Math.round(Number(total) * 100)) {
    throw new Error(
      `Jumlah rincian (${formatCurrency(sum)}) harus sama dengan nominal kwitansi (${formatCurrency(total)}).`
    );
  }
  return payload;
}

const fieldClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 lg:rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand";

export default function ReceiptLinesEditor({
  kind,
  lines,
  onChange,
  total,
  rabItems = [],
}) {
  const isReimbursement = kind === "reimbursement";
  const split = lines.length > 1;
  const allocated = lines.reduce((s, _, i) => s + effectiveAmount(lines, i, total), 0);
  const unallocated = (Number(total) || 0) - allocated;

  const update = (key, patch) =>
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  function addLine() {
    // Saat mulai membagi, rincian pertama memegang seluruh nominal dulu.
    const first = split ? lines : [{ ...lines[0], amount: String(Number(total) || "") }];
    onChange([...first, newLine()]);
  }

  function removeLine(key) {
    const rest = lines.filter((l) => l.key !== key);
    onChange(rest.length === 1 ? [{ ...rest[0], amount: "" }] : rest);
  }

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const item = rabItems.find((it) => it.id === line.pos);
        const outside = !isReimbursement && line.pos === OUTSIDE_RAB;
        const qty = Number(line.quantity) || 0;
        return (
          <div
            key={line.key}
            className={split ? "rounded-lg border border-slate-200 bg-slate-50 p-2.5 space-y-2" : "space-y-2"}
          >
            {split && (
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">Rincian {i + 1}</span>
                <button
                  type="button"
                  onClick={() => removeLine(line.key)}
                  className="p-1 text-slate-500 hover:text-rose-600"
                  aria-label={`Hapus rincian ${i + 1}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}

            <label className="block">
              <span className="text-xs font-medium text-slate-600">
                {isReimbursement ? "Kategori" : "Pos RAB"}
              </span>
              <select
                required={isReimbursement || rabItems.length > 0}
                value={line.pos}
                onChange={(e) => update(line.key, { pos: e.target.value })}
                className={`${fieldClass} bg-white`}
              >
                <option value="" disabled>
                  {isReimbursement ? "Pilih kategori" : "Pilih pos RAB"}
                </option>
                {isReimbursement
                  ? REIMBURSEMENT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))
                  : rabItems.map((it, idx) => (
                      <option key={it.id} value={it.id}>
                        {idx + 1}. {it.description}
                        {it.remainingVolume != null && it.remainingVolume <= 0
                          ? " (volume RAB terpenuhi)"
                          : ""}
                      </option>
                    ))}
                {!isReimbursement && (
                  <option value={OUTSIDE_RAB}>Di luar RAB (tak terduga)</option>
                )}
              </select>
            </label>

            {isReimbursement && line.pos === OTHER_CATEGORY && (
              <label className="block">
                <span className="text-xs font-medium text-slate-600">
                  Sebutkan kategorinya
                </span>
                <input
                  type="text"
                  required
                  value={line.other}
                  onChange={(e) => update(line.key, { other: e.target.value })}
                  className={fieldClass}
                  placeholder="Contoh: Sewa alat, Donasi barang, Biaya admin bank"
                />
              </label>
            )}

            <div className={`grid gap-2 ${split ? "grid-cols-2" : "grid-cols-1"}`}>
              {split && (
                <label className="block">
                  <span className="text-xs font-medium text-slate-600">Nominal (Rp)</span>
                  <CurrencyInput
                    required
                    value={line.amount}
                    onValueChange={(v) => update(line.key, { amount: v })}
                    className={fieldClass}
                  />
                </label>
              )}
              <label className="block">
                <span className="text-xs font-medium text-slate-600">
                  Volume{item?.unit ? ` (${item.unit})` : ""}
                </span>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="any"
                  value={line.quantity}
                  onChange={(e) => update(line.key, { quantity: e.target.value })}
                  className={fieldClass}
                />
              </label>
            </div>

            {item?.remainingVolume != null && (
              <p className={`text-[11px] ${qty > item.remainingVolume ? "text-amber-700" : "text-slate-500"}`}>
                Sisa volume pos ini: {formatVolume(item.remainingVolume)} dari{" "}
                {formatVolume(item.volume)} {item.unit ?? ""}
                {qty > item.remainingVolume &&
                  ` — melebihi RAB ${formatVolume(qty - item.remainingVolume)} ${item.unit ?? ""}, tetap bisa disimpan.`}
              </p>
            )}

            {(isReimbursement || outside) && (
              <label className="block">
                <span className="text-xs font-medium text-slate-600">
                  {outside ? "Alasan di luar RAB" : "Catatan"}
                </span>
                <textarea
                  required
                  rows={2}
                  value={line.notes}
                  onChange={(e) => update(line.key, { notes: e.target.value })}
                  className={fieldClass}
                  placeholder={
                    outside
                      ? "Contoh: Biaya bagasi tambahan, tidak terduga"
                      : "Contoh: Bensin survei lokasi hari ke-1"
                  }
                />
              </label>
            )}
          </div>
        );
      })}

      {split && (
        <p
          className={`text-xs font-medium ${
            unallocated === 0 ? "text-emerald-700" : "text-amber-700"
          }`}
        >
          {unallocated === 0
            ? `Terbagi pas: ${formatCurrency(total)}`
            : unallocated > 0
              ? `Belum dibagi: ${formatCurrency(unallocated)} dari ${formatCurrency(total)}`
              : `Kelebihan ${formatCurrency(-unallocated)} dari total ${formatCurrency(total)}`}
        </p>
      )}

      <button
        type="button"
        onClick={addLine}
        className="inline-flex items-center gap-1 text-xs font-medium text-brand"
      >
        <Plus size={14} />
        {isReimbursement ? "Bagi ke kategori lain" : "Bagi ke pos lain"}
      </button>
    </div>
  );
}
