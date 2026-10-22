"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Loader2, Plus, Trash2, TriangleAlert } from "lucide-react";
import CurrencyInput from "@/components/CurrencyInput";
import UnitSelect from "@/components/UnitSelect";
import { formatCurrency, LARGE_AMOUNT_WARNING, terbilangRupiah } from "@/lib/utils";
import { RAB_TEMPLATE_URL, rabItemTotal, rabTotal } from "@/lib/rab";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";

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
      setImportError("Masukkan link RAB.");
      return;
    }
    if (
      items.some((it) => it.description) &&
      !window.confirm("Ganti semua baris RAB dengan isi link ini?")
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
      setImportError(err.message || "Gagal mengimpor RAB. Periksa link Anda.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-sm font-semibold text-slate-900">Import dari Google Spreadsheet</p>
          <span className="text-xs text-slate-600">Opsional</span>
        </div>
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
            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-brand px-4 text-sm font-semibold text-brand transition-colors hover:bg-primary-muted disabled:opacity-60"
          >
            {importing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            Import
          </button>
        </div>
        {importError && (
          <p className="text-xs text-rose-600 mt-1">{importError}</p>
        )}

        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-900">Template RAB</p>
          <p className="mt-0.5 max-w-prose text-xs leading-relaxed text-slate-600">
            Kolom: No, Uraian, Jumlah, Satuan, Frekuensi, Harga Satuan, Total. Template
            langsung dibuat di Google Spreadsheet Anda. Isi, lalu tempel linknya di atas.
          </p>
          <a
            href={RAB_TEMPLATE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:border-brand hover:text-brand sm:w-auto"
          >
            <FileSpreadsheet size={16} aria-hidden="true" /> Gunakan Template RAB
          </a>
        </div>
      </div>

      {items.map((item, index) => (
        <div
          key={item._key}
          className="space-y-3 border-t border-slate-200 pt-4"
        >
          <div className="flex items-center gap-3">
            <span className="w-4 shrink-0 text-sm font-medium text-slate-600">
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
              className="shrink-0 p-2 text-slate-600 hover:text-rose-600"
              aria-label={`Hapus baris ${index + 1}`}
            >
              <Trash2 size={17} />
            </button>
          </div>
          <div className="@container">
            <div className="grid grid-cols-6 items-end gap-x-3 gap-y-3 @2xl:grid-cols-[84px_minmax(0,1fr)_84px_minmax(0,1.3fr)_7.5rem] @2xl:pl-7">
              <label className="col-span-2 block @2xl:col-span-1">
                <span className="block whitespace-nowrap text-xs text-slate-600">Jumlah</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={item.quantity}
                  onChange={(e) => updateItem(item._key, { quantity: e.target.value })}
                  className={`${inputClass} mt-1 text-center`}
                />
              </label>
              <label className="col-span-2 block @2xl:col-span-1">
                <span className="block whitespace-nowrap text-xs text-slate-600">Satuan</span>
                <div className="mt-1">
                  <UnitSelect
                    value={item.unit ?? ""}
                    onChange={(unit) => updateItem(item._key, { unit })}
                    className={inputClass}
                  />
                </div>
              </label>
              <label className="col-span-2 block @2xl:col-span-1">
                <span className="block whitespace-nowrap text-xs text-slate-600">Frekuensi</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={item.frequency}
                  onChange={(e) => updateItem(item._key, { frequency: e.target.value })}
                  className={`${inputClass} mt-1 text-center`}
                />
              </label>
              <label className="col-span-4 block @2xl:col-span-1">
                <span className="block whitespace-nowrap text-xs text-slate-600">Harga Satuan (Rp)</span>
                <CurrencyInput
                  value={item.unit_price === "" ? "" : String(Math.round(Number(item.unit_price)))}
                  onValueChange={(v) => updateItem(item._key, { unit_price: v })}
                  className={`${inputClass} mt-1 text-right`}
                />
              </label>
              <div className="col-span-2 min-w-0 text-right @2xl:col-span-1">
                <span className="block whitespace-nowrap text-xs text-slate-600">Total</span>
                <span className="mt-1 flex min-h-[2.75rem] items-center justify-end break-words text-sm font-bold text-slate-900">
                  {formatCurrency(rabItemTotal(item))}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onItemsChange([...items, newRabItem()])}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 py-3.5 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand"
      >
        <Plus size={16} /> Tambah Baris RAB
      </button>

      {items.length > 0 && (
        <div className="border-t border-slate-300 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Total RAB</span>
            <span className="text-lg font-bold text-slate-900">
              {formatCurrency(rabTotal(items))}
            </span>
          </div>
          {terbilangRupiah(rabTotal(items)) && (
            <p className="mt-1 text-right text-xs text-slate-600">
              {terbilangRupiah(rabTotal(items))}
            </p>
          )}
          {rabTotal(items) >= LARGE_AMOUNT_WARNING && (
            <p
              role="alert"
              className="mt-3 flex max-w-prose gap-2 text-xs font-medium text-amber-800"
            >
              <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                Nominal besar. Periksa lagi jumlah, frekuensi, dan harga satuan — pastikan tidak ada
                angka nol yang berlebih.
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
