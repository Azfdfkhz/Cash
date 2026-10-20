"use client";

import { useState } from "react";
import { Check, Download, Loader2, Plus, Trash2 } from "lucide-react";
import CurrencyInput from "@/components/CurrencyInput";
import UnitSelect from "@/components/UnitSelect";
import { formatCurrency } from "@/lib/utils";
import { formatVolume, rabItemTotal, rabTotal } from "@/lib/rab";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";
const invalidClass =
  "w-full rounded-xl border border-rose-300 bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-200";

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

// Status satu baris untuk pesan inline. Aturan yang dipakai sama dengan
// `toRabRows` (uraian wajib, jumlah & frekuensi > 0); harga satuan kosong
// hanya diberi peringatan karena nominalnya memang boleh 0 di database.
function rowState(item) {
  const quantity = Number(item.quantity);
  const frequency = Number(item.frequency);
  const price = Number(item.unit_price) || 0;
  const started =
    Boolean(item.description?.trim()) ||
    Boolean(item.unit?.trim()) ||
    (item.unit_price !== "" && item.unit_price != null) ||
    String(item.quantity ?? "") !== "1" ||
    String(item.frequency ?? "") !== "1";

  const descriptionMissing = started && !item.description?.trim();
  const quantityInvalid = started && !(quantity > 0);
  const frequencyInvalid = started && !(frequency > 0);
  const priceMissing = started && !descriptionMissing && !(price > 0);

  const errors = [];
  if (descriptionMissing) errors.push("Uraian belum diisi.");
  if (quantityInvalid) errors.push("Jumlah harus lebih dari 0.");
  if (frequencyInvalid) errors.push("Frekuensi harus lebih dari 0.");

  return {
    started,
    errors,
    warning: priceMissing ? "Harga satuan belum diisi — baris ini dihitung Rp 0." : "",
    volume: (quantity || 0) * (frequency || 0),
    price,
  };
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
  const [importNotice, setImportNotice] = useState("");
  // Baris yang baru ditambahkan supaya kursor langsung siap di kolom uraian.
  const [focusKey, setFocusKey] = useState(null);

  function updateItem(key, patch) {
    onItemsChange(items.map((it) => (it._key === key ? { ...it, ...patch } : it)));
  }

  function addItem() {
    const item = newRabItem();
    setFocusKey(item._key);
    onItemsChange([...items, item]);
  }

  function removeItem(item, index) {
    const hasContent = Boolean(
      item.description?.trim() ||
        item.unit?.trim() ||
        item.unit_price ||
        Number(item.quantity) > 1 ||
        Number(item.frequency) > 1
    );

    // Baris terakhir tidak bisa dihapus (hanya dikosongkan) agar tabel tidak hilang.
    if (items.length === 1) {
      if (
        hasContent &&
        !window.confirm("Kosongkan isi baris RAB ini? Tindakan ini tidak bisa dibatalkan.")
      ) {
        return;
      }
      onItemsChange([newRabItem()]);
      return;
    }

    if (hasContent) {
      const name = item.description?.trim();
      const message = `Hapus baris ${index + 1}${name ? ` (${name})` : ""}? Tindakan ini tidak bisa dibatalkan.`;
      if (!window.confirm(message)) return;
    }
    onItemsChange(items.filter((it) => it._key !== item._key));
  }

  async function handleImport() {
    setImportError("");
    setImportNotice("");
    if (!sourceUrl?.trim()) {
      setImportError("Masukkan link Google Spreadsheet RAB terlebih dahulu.");
      return;
    }
    if (
      items.some((it) => it.description?.trim()) &&
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
      setImportNotice(`${data.items.length} baris diimpor dari spreadsheet.`);
      onImported?.(data);
    } catch (err) {
      setImportError(err.message || "Gagal import spreadsheet.");
    } finally {
      setImporting(false);
    }
  }

  const total = rabTotal(items);
  const hasAnyRow = items.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <label htmlFor="rab-source-url" className="text-sm font-semibold text-slate-900">
            Import dari Google Spreadsheet
          </label>
          <span className="text-xs text-slate-400">Opsional</span>
        </div>
        <div className="flex gap-2">
          <input
            id="rab-source-url"
            type="url"
            value={sourceUrl}
            onChange={(e) => {
              onSourceUrlChange(e.target.value);
              setImportError("");
              setImportNotice("");
            }}
            className={inputClass}
            placeholder="https://docs.google.com/spreadsheets/..."
          />
          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-brand px-4 text-sm font-semibold text-brand transition-colors hover:bg-primary-muted disabled:opacity-60"
          >
            {importing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Download size={16} />
            )}
            {importing ? "Mengimpor..." : "Import"}
          </button>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
          Tempel link sheet dengan akses &quot;Siapa saja yang memiliki link&quot;. Import akan
          mengganti semua baris di bawah. Kolom yang dikenali: Uraian, Jumlah, Satuan, Frekuensi,
          Harga Satuan.
        </p>
        {importError && (
          <p className="mt-1.5 text-xs text-rose-600" role="alert">
            {importError}
          </p>
        )}
        {importNotice && (
          <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-600" role="status">
            <Check size={14} /> {importNotice}
          </p>
        )}
      </div>

      {hasAnyRow && (
        <p className="text-xs leading-relaxed text-slate-500">
          Total per baris = Jumlah × Frekuensi × Harga satuan, dihitung otomatis. Contoh: 2 box × 3
          kali × Rp 25.000 = Rp 150.000.
        </p>
      )}

      {!hasAnyRow && (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-slate-700">Belum ada item anggaran</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
            Tambahkan satu baris untuk setiap jenis pengeluaran. Total RAB dihitung otomatis dari
            jumlah × frekuensi × harga satuan.
          </p>
        </div>
      )}

      {items.map((item, index) => {
        const state = rowState(item);
        const errorId = `rab-row-${index + 1}-note`;
        const message = [...state.errors, state.warning].filter(Boolean).join(" ");
        const fieldClass = state.errors.length ? invalidClass : inputClass;

        return (
          <div
            key={item._key}
            id={`rab-row-${index + 1}`}
            className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor={`rab-desc-${index + 1}`}
                className="text-xs font-semibold text-slate-600"
              >
                {index + 1}. Uraian pengeluaran <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => removeItem(item, index)}
                className="shrink-0 p-1.5 text-slate-400 hover:text-rose-600"
                aria-label={`Hapus baris ${index + 1}${item.description?.trim() ? `: ${item.description.trim()}` : ""}`}
              >
                <Trash2 size={17} />
              </button>
            </div>
            <input
              id={`rab-desc-${index + 1}`}
              type="text"
              value={item.description}
              onChange={(e) => updateItem(item._key, { description: e.target.value })}
              autoFocus={focusKey === item._key}
              aria-invalid={state.errors.length ? true : undefined}
              aria-describedby={message ? errorId : undefined}
              className={fieldClass}
              placeholder="Contoh: Tiket kereta"
            />

            <div className="grid grid-cols-3 gap-3 lg:grid-cols-[84px_minmax(0,1fr)_92px_minmax(0,1.15fr)_150px] lg:items-end lg:gap-x-3">
              <label className="block">
                <span className="text-xs text-slate-500">Jumlah</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  placeholder="2"
                  value={item.quantity}
                  onChange={(e) => updateItem(item._key, { quantity: e.target.value })}
                  aria-invalid={state.errors.some((e) => e.startsWith("Jumlah")) ? true : undefined}
                  className={`${fieldClass} mt-1 text-center`}
                />
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">Satuan</span>
                <div className="mt-1">
                  <UnitSelect
                    value={item.unit ?? ""}
                    onChange={(unit) => updateItem(item._key, { unit })}
                    className={inputClass}
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-xs text-slate-500">Frekuensi</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  placeholder="3"
                  value={item.frequency}
                  onChange={(e) => updateItem(item._key, { frequency: e.target.value })}
                  aria-invalid={
                    state.errors.some((e) => e.startsWith("Frekuensi")) ? true : undefined
                  }
                  className={`${fieldClass} mt-1 text-center`}
                />
              </label>
              <label className="col-span-3 block lg:col-span-1">
                <span className="text-xs text-slate-500">Harga satuan (Rp)</span>
                <CurrencyInput
                  value={item.unit_price === "" ? "" : String(Math.round(Number(item.unit_price)))}
                  onValueChange={(v) => updateItem(item._key, { unit_price: v })}
                  className={`${inputClass} mt-1 text-right`}
                  ariaDescribedBy={state.warning ? errorId : undefined}
                />
              </label>
              <div className="col-span-3 flex items-baseline justify-between gap-3 border-t border-slate-200 pt-3 lg:col-span-1 lg:flex-col lg:items-stretch lg:gap-0 lg:self-start lg:border-0 lg:pt-0 lg:text-right">
                <span className="text-xs text-slate-500">Total</span>
                <div className="lg:mt-1 lg:flex lg:h-[42px] lg:items-center lg:justify-end">
                  <span className="block text-sm font-bold text-slate-900">
                    {formatCurrency(rabItemTotal(item))}
                  </span>
                  {state.volume > 1 && state.price > 0 && (
                    <span className="block whitespace-nowrap text-[11px] text-slate-400">
                      {formatVolume(state.volume)} × {formatCurrency(state.price)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {message && (
              <p
                id={errorId}
                className={`text-xs leading-relaxed ${
                  state.errors.length ? "text-rose-600" : "text-amber-700"
                }`}
              >
                {message}
              </p>
            )}
          </div>
        );
      })}

      <button
        type="button"
        onClick={addItem}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-300 py-3.5 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand"
      >
        <Plus size={16} /> Tambah Baris RAB
      </button>

      {hasAnyRow && (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-[#f1f5f9] px-5 py-4">
          <div className="min-w-0">
            <span className="block text-sm font-semibold text-slate-700">Total RAB</span>
            <span className="block text-xs text-slate-500">
              {items.length} baris
              {total > 0
                ? " · nominal pengajuan mengikuti total ini"
                : " · isi harga satuan supaya total terhitung"}
            </span>
          </div>
          <span className="shrink-0 text-lg font-bold text-slate-900">{formatCurrency(total)}</span>
        </div>
      )}
    </div>
  );
}
