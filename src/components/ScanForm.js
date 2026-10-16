"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, FileText, Loader2, ScanLine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CurrencyInput from "@/components/CurrencyInput";
import { formatCurrency } from "@/lib/utils";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ScanForm({ cashAdvanceId, balance = null }) {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [scanned, setScanned] = useState(false);
  const [scanOk, setScanOk] = useState(false);

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
    setScanOk(false);
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
      setScanOk(true);
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

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand";
  const labelCls = "block text-sm font-medium text-slate-700 mb-1";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 lg:text-2xl lg:font-bold">
            <span className="lg:hidden">Scan Kwitansi</span>
            <span className="hidden lg:inline">
              {scanned ? "Periksa Data Kwitansi" : "Scan Kwitansi"}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 lg:hidden">
            Foto atau PDF kwitansi akan disimpan ke Google Drive dan datanya
            dibaca otomatis.
          </p>
          <p className="hidden text-sm text-slate-500 mt-1 lg:block">
            {scanned
              ? "Data dibaca otomatis dari struk. Periksa dan ubah bila perlu sebelum disimpan."
              : "Foto atau PDF kwitansi akan disimpan ke Google Drive dan datanya dibaca otomatis."}
          </p>
        </div>
        {balance !== null && (
          <div className="hidden shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm lg:block">
            <span className="text-slate-500">Sisa Saldo </span>
            <span className="font-bold text-slate-900">{formatCurrency(balance)}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        {/* Pratinjau (kanan di desktop) */}
        <div className="lg:col-start-2 lg:row-start-1 lg:overflow-hidden lg:rounded-3xl lg:border lg:border-slate-200 lg:bg-white">
          {file && (
            <div className="hidden items-center justify-between gap-3 border-b border-slate-200 px-5 py-3 lg:flex">
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <span className="truncate font-bold text-slate-900">{file.name}</span>
                {scanOk && (
                  <span className="shrink-0 text-xs font-medium text-emerald-600">
                    ✓ Terpindai otomatis
                  </span>
                )}
              </div>
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-xs font-semibold text-brand hover:underline"
                >
                  Buka file
                </a>
              )}
            </div>
          )}

          {!previewUrl ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-2xl py-14 text-slate-500 lg:rounded-3xl lg:border-0 lg:py-28"
            >
              <Camera size={32} />
              <span className="text-sm font-medium">
                Ambil Foto / Pilih Kwitansi
              </span>
            </button>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200 lg:rounded-none lg:border-0">
              {file?.type === "application/pdf" ? (
                <div className="w-full h-40 flex flex-col items-center justify-center gap-2 bg-slate-50 text-slate-500 lg:h-80">
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
                  className="w-full max-h-72 object-contain bg-slate-50 lg:max-h-[30rem]"
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
                className="absolute bottom-2 right-2 bg-white/90 text-slate-700 text-xs font-medium rounded-full px-3 py-1.5 flex items-center gap-1 lg:hidden"
              >
                <ScanLine size={14} /> Ganti Foto
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Form (kiri di desktop) */}
        <div className="space-y-4 lg:col-start-1 lg:row-start-1">
          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {!scanned && (
            <div className="hidden rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 lg:block">
              Pilih foto atau PDF kwitansi di panel kanan. Nominal, vendor, dan
              tanggal akan terisi otomatis.
            </div>
          )}

          {scanned && (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 lg:rounded-3xl lg:p-6"
            >
              {scanOk && (
                <div className="hidden rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 lg:block">
                  <p className="text-sm font-semibold text-slate-900">
                    Data Kwitansi Berhasil Diekstrak
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    OCR otomatis membaca rincian nota. Silakan periksa atau
                    sesuaikan bila diperlukan.
                  </p>
                </div>
              )}

              <div>
                <label className={labelCls}>Nominal (Rp)</label>
                <CurrencyInput
                  required
                  value={amount}
                  onValueChange={setAmount}
                  className={`${inputCls} lg:font-semibold`}
                />
                {balance !== null && (
                  <p className="mt-1.5 hidden text-xs text-slate-400 lg:block">
                    Sisa pagu saldo saat ini: {formatCurrency(balance)}
                  </p>
                )}
              </div>

              <div>
                <label className={labelCls}>Tanggal Kwitansi</label>
                <input
                  type="date"
                  value={receiptDate}
                  onChange={(e) => setReceiptDate(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Toko / Vendor</label>
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Catatan (opsional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="flex gap-3 lg:pt-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="hidden flex-1 rounded-full border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 lg:block"
                >
                  Ambil Ulang Foto
                </button>
                <button
                  type="submit"
                  disabled={saving || scanning}
                  className="flex-1 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-medium rounded-lg py-2.5 transition-colors lg:rounded-full lg:bg-dark-navy lg:font-semibold lg:hover:bg-slate-800"
                >
                  {saving ? (
                    "Menyimpan..."
                  ) : (
                    <>
                      <span className="lg:hidden">Simpan Kwitansi</span>
                      <span className="hidden lg:inline">Simpan Pengeluaran</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
