"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Eye, FileText, Loader2, ScanLine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import CurrencyInput from "@/components/CurrencyInput";
import { OUTSIDE_RAB } from "@/lib/rab";
import ReceiptLinesEditor, { newLine, toLinesPayload } from "@/components/ReceiptLinesEditor";
import { renderPdfPreview } from "@/lib/pdfPreview";
import { FilePreviewModal } from "@/components/FilePreview";
import { scanReceiptFile, uploadProof } from "@/lib/receiptScan";
import { toJpegFile } from "@/lib/imageConvert";

// Kwitansi + rinciannya (pos RAB untuk Cash Advance, kategori untuk
// Reimbursement -- dipakai saat requester merevisi reimbursement). Satu
// kwitansi bisa dibagi ke beberapa pos/kategori.
export default function ScanForm({
  cashAdvanceId,
  rabItems = [],
  kind,
  balance = null,
  // Dipakai di dalam pop up: tata letak dua kolom mengikuti lebar pop up
  // (container query), bukan lebar layar, dan setelah simpan memanggil
  // `onDone` alih-alih router.back().
  embedded = false,
  onDone,
}) {
  const isReimbursement = kind === "reimbursement";
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  // Pratinjau PDF: null = belum/bukan PDF, { pages, pageCount } = siap,
  // { failed: true } = gagal dirender (tetap bisa dibuka lewat "Buka PDF").
  const [pdfPreview, setPdfPreview] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  // Semua halaman PDF (maks. 20) untuk pop up; dirender saat pop up dibuka.
  const [fullPages, setFullPages] = useState(null);
  const [loadingFull, setLoadingFull] = useState(false);

  const isPdf = file?.type === "application/pdf";

  async function openViewer() {
    setViewerOpen(true);
    if (!isPdf || fullPages || !pdfPreview?.pages) return;
    if (pdfPreview.pageCount <= pdfPreview.pages.length) {
      setFullPages(pdfPreview.pages);
      return;
    }
    setLoadingFull(true);
    try {
      const { pages } = await renderPdfPreview(file, { maxPages: 20 });
      setFullPages(pages);
    } catch {
      setFullPages(pdfPreview.pages);
    } finally {
      setLoadingFull(false);
    }
  }
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
  const [lines, setLines] = useState(() => [newLine()]);
  const [preparing, setPreparing] = useState("");
  // "transfer" kalau OCR mengenali bukti transfer (label vendor -> penerima).
  const [documentType, setDocumentType] = useState("receipt");

  async function handleFileChange(e) {
    const raw = e.target.files?.[0];
    e.target.value = "";
    if (!raw) return;

    setError("");
    // Foto (termasuk HEIC iPhone) diubah ke JPEG dulu: pratinjau, OCR, dan
    // file yang diunggah semuanya JPEG.
    setPreparing("Menyiapkan foto...");
    const selected = await toJpegFile(raw, {
      onSlowConversion: () =>
        setPreparing("Mengonversi foto iPhone (HEIC)... bisa sampai 1 menit"),
    });
    setPreparing("");
    setFile(selected);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(selected));
    setPdfPreview(null);
    setFullPages(null);
    setScanned(false);
    setScanOk(false);
    setScanning(true);

    // Render pratinjau PDF paralel dengan OCR.
    if (selected.type === "application/pdf") {
      renderPdfPreview(selected)
        .then(setPdfPreview)
        .catch((err) => {
          console.error("PDF preview failed", err);
          setPdfPreview({ failed: true });
        });
    }

    try {
      const data = await scanReceiptFile(selected);

      if (data.amount) setAmount(String(data.amount));
      if (data.vendor) setVendor(data.vendor);
      setDocumentType(data.documentType ?? "receipt");
      if (data.receiptDate) setReceiptDate(data.receiptDate);
      setRawText(data.rawText || "");
      setScanOk(Boolean(data.amount || data.vendor || data.rawText));
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
    let linesPayload;
    try {
      linesPayload = toLinesPayload(lines, {
        kind,
        total: numericAmount,
        requirePos: rabItems.length > 0,
      });
    } catch (err) {
      setError(err.message);
      return;
    }

    setSaving(true);
    try {
      // Label nama file Drive: pos/kategori rincian pertama (+ "dll" kalau dibagi).
      const first = lines[0];
      const firstLabel = isReimbursement
        ? first.pos
        : first.pos === OUTSIDE_RAB
          ? "Di-luar-RAB"
          : rabItems.find((it) => it.id === first.pos)?.description;
      const { fileId, viewUrl } = await uploadProof(file, {
        cashAdvanceId,
        kind: "kwitansi",
        label: firstLabel ? `${firstLabel}${lines.length > 1 ? " dll" : ""}` : null,
      });

      const supabase = createClient();
      const { error: saveError } = await supabase.rpc("save_receipt", {
        target_id: null,
        ca_id: cashAdvanceId,
        receipt: {
          amount: numericAmount,
          vendor,
          receipt_date: receiptDate,
          notes: notes.trim(),
          drive_file_id: fileId,
          drive_view_url: viewUrl,
          ocr_raw_text: rawText,
        },
        lines: linesPayload,
      });
      if (saveError) throw new Error(saveError.message);

      router.refresh();
      if (onDone) onDone();
      else router.back();
    } catch (err) {
      setError(err.message || "Gagal menyimpan kwitansi. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`${embedded ? "@container " : ""}space-y-4`}>
      {embedded ? (
        <p className="text-sm text-slate-500">
          Kwitansi, struk, nota, atau bukti transfer (foto, screenshot, atau PDF). File
          disimpan ke shared drive dan datanya dibaca otomatis.
        </p>
      ) : (
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 lg:text-2xl lg:font-bold">
            <span className="lg:hidden">Scan Kwitansi / Bukti Transfer</span>
            <span className="hidden lg:inline">
              {scanned ? "Periksa Data Kwitansi" : "Scan Kwitansi / Bukti Transfer"}
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-0.5 lg:mt-1">
            Kwitansi, struk, nota, atau bukti transfer (foto, screenshot, atau
            PDF). File disimpan ke shared drive dan datanya dibaca otomatis.
          </p>
        </div>
        {balance !== null && !isReimbursement && (
          <div className="hidden shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm lg:block">
            <span className="text-slate-500">Sisa Saldo </span>
            <span className="font-bold text-slate-900">{formatCurrency(balance)}</span>
          </div>
        )}
      </div>
      )}

      <div
        className={
          embedded
            ? "flex flex-col gap-4 @2xl:grid @2xl:grid-cols-2 @2xl:items-start @2xl:gap-6"
            : "flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6"
        }
      >
        {/* Pratinjau (kanan di desktop) */}
        <div className={embedded ? "@2xl:col-start-2 @2xl:row-start-1" : "lg:col-start-2 lg:row-start-1"}>
          {preparing ? (
            <div className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-2xl py-14 text-slate-500">
              <Loader2 size={28} className="animate-spin" />
              <span className="text-sm font-medium text-center px-4">{preparing}</span>
            </div>
          ) : !previewUrl ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-2xl py-14 text-slate-500"
            >
              <Camera size={32} />
              <span className="text-sm font-medium">
                Ambil Foto / Pilih Kwitansi atau Bukti Transfer
              </span>
            </button>
          ) : (
            <div className="relative rounded-2xl overflow-hidden border border-slate-200">
              {file?.type === "application/pdf" ? (
                pdfPreview?.pages ? (
                  <div className={`max-h-96 ${embedded ? "@2xl:max-h-[26rem]" : "lg:max-h-[34rem]"} overflow-y-auto bg-slate-100 space-y-2 p-2`}>
                    {pdfPreview.pages.map((src, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={i}
                        src={src}
                        alt={`Halaman ${i + 1} kwitansi`}
                        className="w-full bg-white shadow-sm"
                      />
                    ))}
                    {pdfPreview.pageCount > pdfPreview.pages.length && (
                      <p className="text-center text-xs text-slate-500 py-1">
                        +{pdfPreview.pageCount - pdfPreview.pages.length} halaman
                        lagi, buka PDF untuk melihat semuanya
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-40 flex flex-col items-center justify-center gap-2 bg-slate-50 text-slate-500">
                    {pdfPreview?.failed ? (
                      <FileText size={32} />
                    ) : (
                      <Loader2 size={28} className="animate-spin" />
                    )}
                    <span className="text-xs font-medium truncate max-w-[80%]">
                      {pdfPreview?.failed
                        ? `${file.name} (pratinjau tidak tersedia)`
                        : "Menyiapkan pratinjau PDF..."}
                    </span>
                  </div>
                )
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Preview kwitansi"
                  className={`w-full max-h-72 object-contain bg-slate-50 ${embedded ? "@2xl:max-h-[24rem]" : "lg:max-h-[30rem]"}`}
                />
              )}
              {scanning && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white gap-2">
                  <Loader2 className="animate-spin" size={28} />
                  <span className="text-sm font-medium">
                    Membaca dokumen...
                  </span>
                </div>
              )}
              <div className="absolute bottom-2 right-2 flex gap-2">
                <button
                  type="button"
                  onClick={openViewer}
                  disabled={isPdf && !pdfPreview?.pages && !pdfPreview?.failed}
                  className="bg-white/90 text-slate-700 text-xs font-medium rounded-full px-3 py-1.5 flex items-center gap-1 shadow-sm disabled:opacity-60"
                >
                  <Eye size={14} />
                  {isPdf ? "Lihat PDF" : "Lihat Penuh"}
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white/90 text-slate-700 text-xs font-medium rounded-full px-3 py-1.5 flex items-center gap-1 shadow-sm"
                >
                  <ScanLine size={14} /> Ganti File
                </button>
              </div>
            </div>
          )}

        </div>

        <FilePreviewModal
          open={viewerOpen}
          onClose={() => setViewerOpen(false)}
          title={file?.name}
          images={
            isPdf
              ? fullPages ?? pdfPreview?.pages ?? []
              : previewUrl
                ? [previewUrl]
                : []
          }
          loading={loadingFull}
          fallbackUrl={previewUrl}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.heic,.heif,application/pdf"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />


        {/* Form (kiri di desktop) */}
        <div className={`space-y-4 ${embedded ? "@2xl:col-start-1 @2xl:row-start-1" : "lg:col-start-1 lg:row-start-1"}`}>
          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {!scanned && (
            <div className={`hidden rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 ${embedded ? "@2xl:block" : "lg:block"}`}>
              Pilih foto atau PDF kwitansi di panel kanan. Nominal, vendor, dan
              tanggal akan terisi otomatis.
            </div>
          )}

          {scanned && (
            <form
              onSubmit={handleSubmit}
              className={`bg-white rounded-2xl border border-slate-200 p-5 space-y-4 ${embedded ? "@2xl:rounded-3xl @2xl:p-6" : "lg:rounded-3xl lg:p-6"}`}
            >
              {scanOk && (
                <div className={`hidden rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 ${embedded ? "@2xl:block" : "lg:block"}`}>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nominal (Rp)
                </label>
                <CurrencyInput
                  required
                  value={amount}
                  onValueChange={setAmount}
                  className={`w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand ${embedded ? "@2xl:font-semibold" : "lg:font-semibold"}`}
                />
                {balance !== null && !isReimbursement && (
                  <p className={`mt-1.5 hidden text-xs text-slate-400 ${embedded ? "@2xl:block" : "lg:block"}`}>
                    Sisa pagu saldo saat ini: {formatCurrency(balance)}
                  </p>
                )}
              </div>

              <ReceiptLinesEditor
                kind={kind}
                lines={lines}
                onChange={setLines}
                total={amount}
                rabItems={rabItems}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {documentType === "transfer" ? "Penerima Transfer" : "Toko / Vendor"}
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
                  Catatan kwitansi (opsional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                />
              </div>

              <div className={`flex gap-3 ${embedded ? "@2xl:pt-4" : "lg:pt-4"}`}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`hidden flex-1 rounded-full border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${embedded ? "@2xl:block" : "lg:block"}`}
                >
                  Ganti File
                </button>
                <button
                  type="submit"
                  disabled={saving || scanning}
                  className={`flex-1 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-medium rounded-lg py-2.5 transition-colors ${
                    embedded
                      ? "@2xl:rounded-full @2xl:bg-dark-navy @2xl:font-semibold @2xl:hover:bg-slate-800"
                      : "lg:rounded-full lg:bg-dark-navy lg:font-semibold lg:hover:bg-slate-800"
                  }`}
                >
                  {saving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
