"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, FileText, Loader2, ScanLine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CurrencyInput from "@/components/CurrencyInput";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ScanForm({ cashAdvanceId }) {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [scanned, setScanned] = useState(false);

  const [amount, setAmount] = useState("");
  const [vendor, setVendor] = useState("");
  const [receiptDate, setReceiptDate] = useState("");
  const [notes, setNotes] = useState("");
  const [rawText, setRawText] = useState("");

  async function handleFileChange(e) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setError("");
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setScanned(false);
    setScanning(true);

    try {
      const base64 = await fileToBase64(selected);
      const res = await fetch("/api/ocr/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: selected.type }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      if (data.amount) setAmount(String(data.amount));
      if (data.vendor) setVendor(data.vendor);
      if (data.receiptDate) setReceiptDate(data.receiptDate);
      setRawText(data.rawText || "");
      setScanned(true);
    } catch (err) {
      setError(
        err.message ||
          "Gagal memindai kwitansi otomatis. Silakan isi data secara manual."
      );
      setScanned(true);
    } finally {
      setScanning(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!file) {
      setError("Silakan foto atau pilih kwitansi terlebih dahulu.");
      return;
    }
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError("Nominal kwitansi harus lebih dari 0.");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("cashAdvanceId", cashAdvanceId);

      const uploadRes = await fetch("/api/drive/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: insertError } = await supabase.from("receipts").insert({
        cash_advance_id: cashAdvanceId,
        created_by: user.id,
        amount: numericAmount,
        vendor: vendor || null,
        receipt_date: receiptDate || null,
        notes: notes || null,
        drive_file_id: uploadData.fileId,
        drive_view_url: uploadData.viewUrl,
        ocr_raw_text: rawText || null,
      });

      if (insertError) throw new Error(insertError.message);

      router.back();
      router.refresh();
    } catch (err) {
      setError(err.message || "Gagal menyimpan kwitansi. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Scan Kwitansi
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Foto atau PDF kwitansi akan disimpan ke Google Drive dan datanya
          dibaca otomatis.
        </p>
      </div>

      {!previewUrl ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-2xl py-14 text-slate-500"
        >
          <Camera size={32} />
          <span className="text-sm font-medium">
            Ambil Foto / Pilih Kwitansi
          </span>
        </button>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200">
          {file?.type === "application/pdf" ? (
            <div className="w-full h-40 flex flex-col items-center justify-center gap-2 bg-slate-50 text-slate-500">
              <FileText size={32} />
              <span className="text-xs font-medium truncate max-w-[80%]">
                {file.name}
              </span>
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Preview kwitansi"
              className="w-full max-h-72 object-contain bg-slate-50"
            />
          )}
          {scanning && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white gap-2">
              <Loader2 className="animate-spin" size={28} />
              <span className="text-sm font-medium">
                Membaca kwitansi...
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-2 right-2 bg-white/90 text-slate-700 text-xs font-medium rounded-full px-3 py-1.5 flex items-center gap-1"
          >
            <ScanLine size={14} /> Ganti Foto
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {error && (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {scanned && (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nominal (Rp)
            </label>
            <CurrencyInput
              required
              value={amount}
              onValueChange={setAmount}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Toko / Vendor
            </label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Tanggal Kwitansi
            </label>
            <input
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Catatan (opsional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>

          <button
            type="submit"
            disabled={saving || scanning}
            className="w-full bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-medium rounded-lg py-2.5 transition-colors"
          >
            {saving ? "Menyimpan..." : "Simpan Kwitansi"}
          </button>
        </form>
      )}
    </div>
  );
}
