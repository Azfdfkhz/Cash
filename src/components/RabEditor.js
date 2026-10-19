"use client";

import { useState } from "react";
import { FileSpreadsheet, Loader2, Plus, Trash2 } from "lucide-react";
import CurrencyInput from "@/components/CurrencyInput";
import UnitSelect from "@/components/UnitSelect";
import { formatCurrency } from "@/lib/utils";
import { rabItemTotal, rabTotal } from "@/lib/rab";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 lg:rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand";

let keySeq = 0;
export function newRabItem(fields = {}) {
  return {
    _key: `rab-${++keySeq}`,
    description: "",
    quantity: 1,
    unit: "",
    frequency: 1,
    unit_price: "",
    ...fields,
  };
}

// Validasi + bentuk baris siap insert (tanpa _key/id/total).
export function toRabRows(items, cashAdvanceId) {
  return items.map((item, index) => {
    if (!item.description?.trim()) {
      throw new Error(`Uraian RAB baris ${index + 1} belum diisi.`);
    }
    const quantity = Number(item.quantity);
    const frequency = Number(item.frequency);
    if (!(quantity > 0) || !(frequency > 0)) {
      throw new Error(`Jumlah & frekuensi RAB baris ${index + 1} harus lebih dari 0.`);
    }
    return {
      cash_advance_id: cashAdvanceId,
      position: index,
      description: item.description.trim(),
      quantity,
      unit: item.unit?.trim() || null,
      frequency,
      unit_price: Number(item.unit_price) || 0,
    };
  });
}

export default function RabEditor({
  items,
  onItemsChange,
  sourceUrl,
  onSourceUrlChange,
  onImported,
}) {
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");

  function updateItem(key, patch) {
    onItemsChange(items.map((it) => (it._key === key ? { ...it, ...patch } : it)));
  }

  async function handleImport() {
    setImportError("");
    if (!sourceUrl?.trim()) {
      setImportError("Masukkan link Google Spreadsheet RAB.");
      return;
    }
    if (
      items.some((it) => it.description) &&
      !window.confirm("Ganti semua baris RAB dengan isi spreadsheet?")
    ) {
      return;
    }
    setImporting(true);
    try {
      const res = await fetch("/api/rab/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sourceUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onItemsChange(data.items.map((it) => newRabItem(it)));
      onImported?.(data);
    } catch (err) {
      setImportError(err.message || "Gagal import spreadsheet.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs text-slate-500 mb-1">
          Import dari Google Spreadsheet{" "}
          <span className="text-slate-400">(opsional)</span>
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => onSourceUrlChange(e.target.value)}
            className={inputClass}
            placeholder="https://docs.google.com/spreadsheets/..."
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-brand text-brand px-3 text-sm font-medium disabled:opacity-60"
          >
            {importing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileSpreadsheet size={16} />
            )}
            Import
          </button>
        </div>
        {importError && (
          <p className="text-xs text-rose-600 mt-1">{importError}</p>
        )}
      </div>

      {items.map((item, index) => (
        <div
          key={item._key}
          className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2"
        >
          <div className="flex items-start gap-2">
            <span className="text-xs font-medium text-slate-400 pt-2.5 w-4 shrink-0">
              {index + 1}
            </span>
            <input
              type="text"
              value={item.description}
              onChange={(e) => updateItem(item._key, { description: e.target.value })}
              className={inputClass}
              placeholder="Uraian, contoh: Tiket kereta"
            />
            <button
              type="button"
              onClick={() => onItemsChange(items.filter((it) => it._key !== item._key))}
              className="shrink-0 p-2 text-slate-400 hover:text-rose-600"
              aria-label={`Hapus baris ${index + 1}`}
            >
              <Trash2 size={16} />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2 pl-6">
            <label className="block">
              <span className="text-[11px] text-slate-500">Jumlah</span>
              <input
                type="number"
                min="0"
                step="any"
                value={item.quantity}
                onChange={(e) => updateItem(item._key, { quantity: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-slate-500">Satuan</span>
              <UnitSelect
                value={item.unit ?? ""}
                onChange={(unit) => updateItem(item._key, { unit })}
                className={inputClass}
              />
            </label>
            <label className="block col-span-2">
              <span className="text-[11px] text-slate-500">Frekuensi</span>
              <input
                type="number"
                min="0"
                step="any"
                value={item.frequency}
                onChange={(e) => updateItem(item._key, { frequency: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block col-span-2">
              <span className="text-[11px] text-slate-500">Harga Satuan (Rp)</span>
              <CurrencyInput
                value={item.unit_price === "" ? "" : String(Math.round(Number(item.unit_price)))}
                onValueChange={(v) => updateItem(item._key, { unit_price: v })}
                className={inputClass}
              />
            </label>
            <div className="col-span-2 text-right self-end pb-2">
              <span className="text-[11px] text-slate-500 block">Total</span>
              <span className="text-sm font-semibold text-slate-900">
                {formatCurrency(rabItemTotal(item))}
              </span>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onItemsChange([...items, newRabItem()])}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 py-2 text-sm font-medium text-slate-600 hover:border-brand hover:text-brand"
      >
        <Plus size={16} /> Tambah Baris RAB
      </button>

      {items.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2">
          <span className="text-sm text-slate-600">Total RAB</span>
          <span className="text-sm font-semibold text-slate-900">
            {formatCurrency(rabTotal(items))}
          </span>
        </div>
      )}
    </div>
  );
}
