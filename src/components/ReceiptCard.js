"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CurrencyInput from "@/components/CurrencyInput";
import { DriveInlinePreview, FilePreviewLink } from "@/components/FilePreview";
import ReceiptLinesEditor, {
  linesFromReceipt,
  toLinesPayload,
} from "@/components/ReceiptLinesEditor";
import { formatCurrency, formatDate } from "@/lib/utils";
import { formatVolume, receiptLines } from "@/lib/rab";
import DateInput from "@/components/request/DateInput";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 lg:rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand";

export default function ReceiptCard({
  receipt,
  rabItems = [],
  canModify = false,
  kind,
}) {
  const isReimbursement = kind === "reimbursement";
  const router = useRouter();
  const [mode, setMode] = useState("view"); // view | edit | confirm-delete
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Jangan null: React Compiler bisa membaca form.amount dkk. saat render
  // pertama (untuk memoisasi), jadi null membuat kartu crash.
  const [form, setForm] = useState({ amount: "", vendor: "", receiptDate: "", notes: "" });
  const [lines, setLines] = useState([]);

  const savedLines = receiptLines(receipt);
  const split = savedLines.length > 1;

  function lineLabel(line) {
    if (isReimbursement) return line.category ?? "Tanpa kategori";
    if (line.outside_rab) return "Di luar RAB";
    const item = rabItems.find((it) => it.id === line.rab_item_id);
    return item ? `Pos RAB: ${item.description}` : rabItems.length ? "Belum ditandai pos RAB" : null;
  }

  function lineDetail(line) {
    const unit = rabItems.find((it) => it.id === line.rab_item_id)?.unit;
    return `volume ${formatVolume(line.quantity ?? 1)}${unit ? ` ${unit}` : ""}`;
  }

  function startEdit() {
    setForm({
      amount: String(Math.round(Number(receipt.amount))),
      vendor: receipt.vendor ?? "",
      receiptDate: receipt.receipt_date ?? "",
      // Kwitansi lama: alasan di luar RAB / catatan kategori tersalin ke
      // rincian (migration 0024) -- jangan tampil dobel sebagai catatan kwitansi.
      notes: receipt.notes && receipt.notes !== savedLines[0].notes ? receipt.notes : "",
    });
    setLines(linesFromReceipt(receipt, kind));
    setError("");
    setMode("edit");
  }

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    const amount = Number(form.amount);
    if (!(amount > 0)) return setError("Nominal harus lebih dari 0.");
    let payload;
    try {
      payload = toLinesPayload(lines, {
        kind,
        total: amount,
        requirePos: rabItems.length > 0,
      });
    } catch (err) {
      return setError(err.message);
    }

    setSaving(true);
    const supabase = createClient();
    const { error: saveError } = await supabase.rpc("save_receipt", {
      target_id: receipt.id,
      ca_id: receipt.cash_advance_id,
      receipt: {
        amount,
        vendor: form.vendor,
        receipt_date: form.receiptDate,
        notes: form.notes,
      },
      lines: payload,
    });
    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }
    setMode("view");
    router.refresh();
  }

  async function handleDelete() {
    setError("");
    setSaving(true);
    const supabase = createClient();
    const { data, error: deleteError } = await supabase
      .from("receipts")
      .delete()
      .eq("id", receipt.id)
      .select("id");
    setSaving(false);

    if (deleteError || !data?.length) {
      setError(deleteError?.message || "Kwitansi tidak bisa dihapus.");
      setMode("view");
      return;
    }
    router.refresh();
  }

  const previewTitle = `Kwitansi ${receipt.vendor || ""}`.trim();

  const detailLine = (line) =>
    [lineLabel(line), !isReimbursement && !line.outside_rab ? lineDetail(line) : null, line.notes]
      .filter(Boolean)
      .join(" · ");

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-start gap-3.5 p-4">
        {receipt.drive_view_url && (
          <DriveInlinePreview
            url={receipt.drive_view_url}
            title={previewTitle}
            variant="thumb"
            className="!h-20 !w-20 !rounded-xl"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-bold leading-snug text-slate-900">
                {receipt.vendor || "Kwitansi"}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">
                {formatDate(receipt.receipt_date || receipt.created_at)}
                {split && ` · dibagi ${savedLines.length} rincian`}
              </p>
            </div>
            <p className="shrink-0 text-base font-extrabold tabular-nums tracking-tight text-slate-900">
              {formatCurrency(receipt.amount)}
            </p>
          </div>

          {receipt.drive_view_url && (
            <FilePreviewLink
              url={receipt.drive_view_url}
              title={previewTitle}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Eye size={13} /> Lihat bukti
            </FilePreviewLink>
          )}
        </div>
      </div>

      {(split || lineLabel(savedLines[0]) || savedLines[0].notes || receipt.notes) && (
        <div className="space-y-1.5 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
          {split
            ? savedLines.map((line) => (
                <div key={line.id} className="flex items-start justify-between gap-3 text-xs">
                  <span
                    className={`min-w-0 break-words leading-relaxed ${
                      line.outside_rab ? "text-amber-700" : "text-slate-700"
                    }`}
                  >
                    {detailLine(line)}
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-slate-900">
                    {formatCurrency(line.amount)}
                  </span>
                </div>
              ))
            : detailLine(savedLines[0]) && (
                <p
                  className={`break-words text-xs leading-relaxed ${
                    savedLines[0].outside_rab ? "text-amber-700" : "text-slate-700"
                  }`}
                >
                  {detailLine(savedLines[0])}
                </p>
              )}
          {receipt.notes && receipt.notes !== savedLines[0].notes && (
            <p className="break-words text-xs italic leading-relaxed text-slate-600">
              {receipt.notes}
            </p>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="mx-4 mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
          {error}
        </div>
      )}

      {canModify && mode === "view" && (
        <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-2.5">
          <button
            type="button"
            onClick={startEdit}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            type="button"
            onClick={() => {
              setError("");
              setMode("confirm-delete");
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 px-3.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
          >
            <Trash2 size={12} /> Hapus
          </button>
        </div>
      )}

      {mode === "confirm-delete" && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rose-100 bg-rose-50 px-4 py-3">
          <p className="text-xs font-semibold text-rose-800">Hapus kwitansi ini?</p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setMode("view")}
              disabled={saving}
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="rounded-full bg-rose-600 px-4 py-1.5 text-xs font-bold text-white disabled:opacity-60"
            >
              {saving ? "Menghapus..." : "Ya, Hapus"}
            </button>
          </div>
        </div>
      )}

      {mode === "edit" && (
        <form onSubmit={handleSave} className="space-y-2 border-t border-slate-100 bg-slate-50/50 p-4">
          <div className="grid grid-cols-2 gap-2">
            <label className="block col-span-2">
              <span className="text-xs text-slate-600">Nominal Kwitansi (Rp)</span>
              <CurrencyInput
                required
                value={form.amount}
                onValueChange={(v) => set({ amount: v })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-600">Toko / Penerima</span>
              <input
                type="text"
                value={form.vendor}
                onChange={(e) => set({ vendor: e.target.value })}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="text-xs text-slate-600">Tanggal</span>
              <DateInput
                value={form.receiptDate}
                onChange={(v) => set({ receiptDate: v })}
                className={inputClass}
              />
            </label>
          </div>

          <ReceiptLinesEditor
            kind={kind}
            lines={lines}
            onChange={setLines}
            total={form.amount}
            rabItems={rabItems}
          />

          <label className="block">
            <span className="text-xs text-slate-600">Catatan kwitansi (opsional)</span>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set({ notes: e.target.value })}
              className={inputClass}
            />
          </label>

          <p className="text-xs text-slate-600">
            Foto salah? Hapus kwitansi ini lalu scan ulang.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("view")}
              disabled={saving}
              className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-brand hover:bg-brand-dark disabled:opacity-60 py-2 text-sm font-medium text-white lg:rounded-full lg:bg-dark-navy lg:font-semibold lg:hover:bg-slate-800"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
