"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, Eye, FileText, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CurrencyInput from "@/components/CurrencyInput";
import { FilePreviewLink, LocalFilePreview } from "@/components/FilePreview";
import {
  formatCurrency,
  formatDate,
  toCsvValue,
  downloadCsv,
  COMPANY_RETURN_ACCOUNTS,
} from "@/lib/utils";
import { compareRab, describeReceiptLines, receiptLines } from "@/lib/rab";
import { toJpegFile } from "@/lib/imageConvert";

async function downloadClosureReport(supabase, cashAdvanceId) {
  const { data: ca } = await supabase
    .from("cash_advances")
    .select("*, profiles:requester_id(full_name)")
    .eq("id", cashAdvanceId)
    .single();

  const { data: receipts } = await supabase
    .from("receipts")
    .select("*, receipt_lines(*)")
    .eq("cash_advance_id", cashAdvanceId)
    .order("created_at", { ascending: true });

  const { data: returns } = await supabase
    .from("cash_advance_returns")
    .select("*, confirmedBy:confirmed_by(full_name)")
    .eq("cash_advance_id", cashAdvanceId)
    .order("created_at", { ascending: true });

  const { data: reimbursements } = await supabase
    .from("cash_advance_reimbursements")
    .select("*, createdBy:created_by(full_name)")
    .eq("cash_advance_id", cashAdvanceId)
    .order("created_at", { ascending: true });

  const { data: rabItems } = await supabase
    .from("rab_items")
    .select("*")
    .eq("cash_advance_id", cashAdvanceId)
    .order("position");
  const rab = compareRab(rabItems ?? [], receipts ?? []);

  const totalSpent = (receipts ?? []).reduce(
    (sum, r) => sum + Number(r.amount || 0),
    0
  );
  const totalReturned = (returns ?? [])
    .filter((r) => r.confirmed_at)
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalReimbursed = (reimbursements ?? []).reduce(
    (sum, r) => sum + Number(r.amount || 0),
    0
  );

  const lines = [
    `Laporan Cash Advance - ${toCsvValue(ca.purpose)}`,
    `Requester,${toCsvValue(ca.profiles?.full_name)}`,
    `Nominal Diajukan,${ca.amount_requested}`,
    "",
    ...(rab.rows.length
      ? [
          "PERBANDINGAN RAB VS REALISASI",
          ["No", "Uraian", "Jumlah", "Satuan", "Frekuensi", "Harga Satuan", "Total RAB", "Volume RAB", "Volume Realisasi", "Realisasi", "Sisa"].join(","),
          ...rab.rows.map(({ item, budget, realized, remaining, volume, usedVolume }, i) =>
            [
              i + 1,
              item.description,
              item.quantity,
              item.unit,
              item.frequency,
              item.unit_price,
              budget,
              volume,
              usedVolume,
              realized,
              remaining,
            ]
              .map(toCsvValue)
              .join(",")
          ),
          ...(rab.outside.length
            ? [["", "Di luar RAB (tak terduga)", "", "", "", "", 0, "", rab.outside.reduce((s, r) => s + Number(r.quantity ?? 1), 0), rab.outsideTotal, -rab.outsideTotal].map(toCsvValue).join(",")]
            : []),
          ...(rab.unassigned.length
            ? [["", "Kwitansi tanpa pos RAB", "", "", "", "", "", "", "", rab.unassignedTotal, -rab.unassignedTotal].map(toCsvValue).join(",")]
            : []),
          ["Total", "", "", "", "", "", rab.totalBudget, "", "", rab.totalRealized, rab.totalRemaining].map(toCsvValue).join(","),
          "",
        ]
      : []),
    "KWITANSI REALISASI",
    ["Tanggal", "Pos RAB / Kategori", "Vendor", "Volume", "Nominal", "Catatan", "Link Foto"].join(","),
    ...(receipts ?? []).map((r) =>
      [
        r.receipt_date ? formatDate(r.receipt_date) : "-",
        describeReceiptLines(r, { items: rabItems ?? [], formatCurrency }),
        r.vendor,
        receiptLines(r).reduce((s, l) => s + Number(l.quantity ?? 1), 0),
        r.amount,
        [r.notes, ...receiptLines(r).map((l) => l.notes)].filter(Boolean).join("; "),
        r.drive_view_url,
      ]
        .map(toCsvValue)
        .join(",")
    ),
    "",
    "DETAIL PENGEMBALIAN",
    ["Tanggal", "Nominal", "Catatan", "Dikonfirmasi Oleh", "Bukti Transfer"].join(
      ","
    ),
    ...(returns ?? []).map((r) =>
      [
        formatDate(r.created_at),
        r.amount,
        r.note,
        r.confirmedBy?.full_name || "-",
        r.proof_drive_view_url,
      ]
        .map(toCsvValue)
        .join(",")
    ),
    "",
    "PENGGANTIAN KELEBIHAN BELANJA",
    ["Tanggal", "Nominal", "Catatan", "Dicatat Oleh", "Bukti Transfer"].join(
      ","
    ),
    ...(reimbursements ?? []).map((r) =>
      [
        formatDate(r.created_at),
        r.amount,
        r.note,
        r.createdBy?.full_name || "-",
        r.proof_drive_view_url,
      ]
        .map(toCsvValue)
        .join(",")
    ),
    "",
    `Total Terpakai,${totalSpent}`,
    `Total Dikembalikan,${totalReturned}`,
    `Total Diganti Perusahaan,${totalReimbursed}`,
  ];

  downloadCsv(`laporan-ca-${cashAdvanceId.slice(0, 8)}.csv`, lines);
}

export default function ReturnsSection({
  cashAdvanceId,
  status,
  isOwner,
  isOperational,
  balance,
  totalReturned,
  returns,
  totalReimbursed,
  reimbursements,
  reportUrl,
  bankName,
  bankAccountNumber,
  bankAccountHolder,
  kind,
  amountRequested = 0,
  totalSpent = 0,
  // Dipanggil setelah pengembalian tersimpan (dipakai ReturnPopup untuk
  // menampilkan status pengembalian).
  onReturnSubmitted,
}) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [amount, setAmount] = useState(balance > 0 ? String(balance) : "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [closing, setClosing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState("");

  const reimburseFileInputRef = useRef(null);
  const [reimburseFile, setReimburseFile] = useState(null);
  const deficit = Math.abs(Math.min(balance, 0)) - totalReimbursed;
  const [reimburseAmount, setReimburseAmount] = useState(
    deficit > 0 ? String(deficit) : ""
  );
  const [reimburseNote, setReimburseNote] = useState("");
  const [reimbursing, setReimbursing] = useState(false);

  const remaining = balance - totalReturned;
  // Reimbursement tidak punya sisa/kekurangan: selesai lewat transfer
  // reimbursement (DisbursementSection), jadi form-form ini tidak berlaku.
  const isCashAdvance = kind !== "reimbursement";
  const showReturnForm =
    isCashAdvance && isOwner && status === "approved" && remaining > 0;
  const showReimburseForm =
    isCashAdvance && isOperational && status === "approved" && balance < 0 && deficit > 0;
  const showDirectClose =
    isCashAdvance && isOperational && status === "approved" && balance === 0;

  async function handleSubmitReturn(e) {
    e.preventDefault();
    setError("");

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError("Nominal pengembalian harus lebih dari 0.");
      return;
    }
    if (!file) {
      setError("Silakan lampirkan foto/bukti transfer.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("cashAdvanceId", cashAdvanceId);
      formData.append("kind", "bukti-pengembalian");

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

      const { error: insertError } = await supabase
        .from("cash_advance_returns")
        .insert({
          cash_advance_id: cashAdvanceId,
          created_by: user.id,
          amount: numericAmount,
          note: note || null,
          proof_drive_file_id: uploadData.fileId,
          proof_drive_view_url: uploadData.viewUrl,
        });

      if (insertError) throw new Error(insertError.message);

      onReturnSubmitted?.({
        amount: numericAmount,
        note,
        file,
        viewUrl: uploadData.viewUrl,
        submittedAt: new Date().toISOString(),
      });
      setFile(null);
      setNote("");
      router.refresh();
    } catch (err) {
      setError(err.message || "Gagal menyimpan pengembalian. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitReimbursement(e) {
    e.preventDefault();
    setError("");

    const numericAmount = Number(reimburseAmount);
    if (!numericAmount || numericAmount <= 0) {
      setError("Nominal penggantian harus lebih dari 0.");
      return;
    }
    if (!reimburseFile) {
      setError("Silakan lampirkan foto/bukti transfer.");
      return;
    }

    setReimbursing(true);
    try {
      const formData = new FormData();
      formData.append("file", reimburseFile);
      formData.append("cashAdvanceId", cashAdvanceId);
      formData.append("kind", "bukti-penggantian");

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

      const { data: inserted, error: insertError } = await supabase
        .from("cash_advance_reimbursements")
        .insert({
          cash_advance_id: cashAdvanceId,
          created_by: user.id,
          amount: numericAmount,
          note: reimburseNote || null,
          proof_drive_file_id: uploadData.fileId,
          proof_drive_view_url: uploadData.viewUrl,
        })
        .select("id")
        .single();

      if (insertError) throw new Error(insertError.message);

      const { data: updatedCa } = await supabase
        .from("cash_advances")
        .select("status")
        .eq("id", cashAdvanceId)
        .single();

      // Notifikasi dikirim setelah status terbaru terbaca, supaya pesannya
      // bisa bilang "sudah selesai" kalau penggantian ini menutup kekurangan.
      fetch(`/api/cash-advances/${cashAdvanceId}/notify-reimbursed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reimbursementId: inserted.id }),
      }).catch(() => {});

      if (updatedCa?.status === "closed") {
        await handleClosed(supabase);
      }

      setReimburseFile(null);
      setReimburseNote("");
      router.refresh();
    } catch (err) {
      setError(err.message || "Gagal menyimpan penggantian. Coba lagi.");
    } finally {
      setReimbursing(false);
    }
  }

  // Batalkan pengembalian yang belum dikonfirmasi (mis. supaya kwitansi
  // bisa dikoreksi dulu). Policy returns_delete_unconfirmed di DB yang
  // menjaga hanya yang belum dikonfirmasi yang bisa dihapus.
  async function handleCancelReturn(returnId) {
    setError("");
    setConfirmingId(returnId);
    const supabase = createClient();
    const { data, error: deleteError } = await supabase
      .from("cash_advance_returns")
      .delete()
      .eq("id", returnId)
      .is("confirmed_at", null)
      .select("id");
    setConfirmingId(null);
    if (deleteError || !data?.length) {
      setError("Gagal membatalkan pengembalian.");
      return;
    }
    router.refresh();
  }

  async function handleConfirm(returnId) {
    setError("");
    setConfirmingId(returnId);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from("cash_advance_returns")
      .update({ confirmed_by: user.id, confirmed_at: new Date().toISOString() })
      .eq("id", returnId);

    if (updateError) {
      setError("Gagal mengonfirmasi pengembalian.");
      setConfirmingId(null);
      return;
    }

    const { data: updatedCa } = await supabase
      .from("cash_advances")
      .select("status")
      .eq("id", cashAdvanceId)
      .single();

    if (updatedCa?.status === "closed") {
      await handleClosed(supabase);
    }

    setConfirmingId(null);
    router.refresh();
  }

  async function handleCloseDirect() {
    setError("");
    setClosing(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("cash_advances")
      .update({ status: "closed" })
      .eq("id", cashAdvanceId);

    if (updateError) {
      setError("Gagal menutup pengajuan.");
      setClosing(false);
      return;
    }

    await handleClosed(supabase);
    setClosing(false);
    router.refresh();
  }

  // Simpan laporan PDF ke folder Drive pengajuan. Kalau gagal, tombol
  // "Simpan Laporan ke Drive" tetap muncul untuk dicoba ulang.
  // force = buat ulang & simpan file laporan baru (mis. setelah lampiran
  // yang dulu gagal dimuat sudah bisa dimuat).
  async function archiveReport({ force = false } = {}) {
    setArchiving(true);
    try {
      const res = await fetch(
        `/api/cash-advances/${cashAdvanceId}/report${force ? "?force=1" : ""}`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Gagal menyimpan laporan ke Drive.");
      }
    } catch {
      setError("Gagal menyimpan laporan ke Drive.");
    } finally {
      setArchiving(false);
    }
  }

  async function handleClosed(supabase) {
    await archiveReport();
    await downloadClosureReport(supabase, cashAdvanceId);
  }

  async function handleDownload() {
    const supabase = createClient();
    await downloadClosureReport(supabase, cashAdvanceId);
  }

  const hasReturns = returns && returns.length > 0;
  const hasReimbursements = reimbursements && reimbursements.length > 0;

  if (
    !hasReturns &&
    !hasReimbursements &&
    !showReturnForm &&
    !showReimburseForm &&
    !showDirectClose &&
    status !== "closed"
  ) {
    return null;
  }

  return (
    <div className="space-y-3">
      {(hasReturns || remaining > 0) && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">
            Pengembalian Sisa Saldo
          </h2>

          {balance > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-2 text-sm text-amber-800">
              Sisa saldo yang perlu dikembalikan:{" "}
              <span className="font-semibold">
                {formatCurrency(Math.max(remaining, 0))}
              </span>
              {remaining > 0 && (
                <div className="mt-2 border-t border-amber-200 pt-2">
                  <p className="text-xs">
                    Transfer sisa dana ke salah satu rekening berikut, lalu
                    unggah bukti transfernya:
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {COMPANY_RETURN_ACCOUNTS.map((acc) => (
                      <li key={acc.number} className="text-xs">
                        {acc.bank} ·{" "}
                        <span className="font-semibold tracking-wide select-all">
                          {acc.number}
                        </span>{" "}
                        a.n. {acc.holder}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {hasReturns && (
            <div className="space-y-2 mb-2">
              {returns.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">
                      {formatCurrency(r.amount)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(r.created_at)}
                      {r.note ? ` · ${r.note}` : ""}
                    </p>
                    {r.proof_drive_view_url && (
                      <FilePreviewLink
                        url={r.proof_drive_view_url}
                        title={`Bukti transfer ${formatCurrency(r.amount)}`}
                        className="text-xs text-brand inline-flex items-center gap-1 mt-1"
                      >
                        Lihat bukti <Eye size={12} />
                      </FilePreviewLink>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    {r.confirmed_at ? (
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                        Terkonfirmasi
                      </span>
                    ) : isOperational ? (
                      <button
                        onClick={() => handleConfirm(r.id)}
                        disabled={confirmingId === r.id}
                        className="flex items-center gap-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg px-2.5 py-1.5"
                      >
                        <Check size={12} />
                        {confirmingId === r.id ? "..." : "Konfirmasi"}
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                        Menunggu konfirmasi
                      </span>
                    )}
                    {!r.confirmed_at && (isOwner || isOperational) && (
                      <button
                        onClick={() => handleCancelReturn(r.id)}
                        disabled={confirmingId === r.id}
                        className="text-xs font-medium text-rose-600 disabled:opacity-60"
                      >
                        Batalkan
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(hasReimbursements || deficit > 0) && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">
            Penggantian Kelebihan Belanja
          </h2>

          {balance < 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-2 text-sm text-rose-800">
              Kekurangan yang perlu diganti ke requester:{" "}
              <span className="font-semibold">
                {formatCurrency(Math.max(deficit, 0))}
              </span>
              {deficit > 0 && (bankName || bankAccountNumber) && (
                <div className="mt-2 border-t border-rose-200 pt-2 text-xs">
                  Transfer ke rekening requester (sesuai pengajuan):
                  <p className="mt-1">
                    {bankName} ·{" "}
                    <span className="font-semibold tracking-wide select-all">
                      {bankAccountNumber}
                    </span>
                    {bankAccountHolder ? ` a.n. ${bankAccountHolder}` : ""}
                  </p>
                </div>
              )}
            </div>
          )}

          {hasReimbursements && (
            <div className="space-y-2 mb-2">
              {reimbursements.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">
                      {formatCurrency(r.amount)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(r.created_at)}
                      {r.note ? ` · ${r.note}` : ""}
                    </p>
                    {r.proof_drive_view_url && (
                      <FilePreviewLink
                        url={r.proof_drive_view_url}
                        title={`Bukti transfer ${formatCurrency(r.amount)}`}
                        className="text-xs text-brand inline-flex items-center gap-1 mt-1"
                      >
                        Lihat bukti <Eye size={12} />
                      </FilePreviewLink>
                    )}
                  </div>
                  <div className="shrink-0">
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                      Sudah diganti
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {showReturnForm && (
        <div className="space-y-3 lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-5 lg:space-y-0">
          <form
            id="return-form"
            onSubmit={handleSubmitReturn}
            className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 lg:rounded-3xl lg:p-6 lg:space-y-5"
          >
            <p className="text-sm font-semibold text-slate-700 lg:text-base lg:text-slate-900">
              Ajukan Pengembalian
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nominal Dikembalikan (Rp)
              </label>
              <div className="relative">
                <CurrencyInput
                  required
                  value={amount}
                  onValueChange={setAmount}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand lg:pr-20 lg:font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setAmount(String(Math.max(remaining, 0)))}
                  className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 lg:block"
                >
                  Semua
                </button>
              </div>
              <p className="mt-1.5 hidden text-xs text-slate-400 lg:block">
                Sisa saldo yang perlu dikembalikan:{" "}
                {formatCurrency(Math.max(remaining, 0))}.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Bukti Transfer
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl py-4 text-slate-500 text-sm lg:flex-col lg:gap-1.5 lg:rounded-2xl lg:bg-slate-50 lg:py-10"
              >
                <Upload size={16} />
                {file ? (
                  file.name
                ) : (
                  <>
                    <span className="lg:hidden">Unggah foto bukti transfer</span>
                    <span className="hidden lg:inline">
                      Seret file ke sini, atau{" "}
                      <span className="font-semibold text-brand">pilih dokumen</span>
                    </span>
                    <span className="hidden text-xs text-slate-400 lg:inline">
                      JPG atau PNG
                    </span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                onChange={async (e) => {
                  const raw = e.target.files?.[0];
                  e.target.value = "";
                  setFile(raw ? await toJpegFile(raw) : null);
                }}
                className="hidden"
              />
              <LocalFilePreview file={file} className="mt-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Catatan (opsional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-medium rounded-lg py-2.5 transition-colors lg:hidden"
            >
              {submitting ? "Menyimpan..." : "Kirim Pengembalian"}
            </button>
          </form>

          <aside className="hidden space-y-3 lg:block">
            <div className="rounded-3xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500">Sisa dana yang perlu dikembalikan</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                {formatCurrency(Math.max(remaining, 0))}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-dark-navy"
                  style={{
                    width: `${
                      amountRequested > 0
                        ? Math.min(100, Math.max(0, (totalSpent / amountRequested) * 100))
                        : 0
                    }%`,
                  }}
                />
              </div>
              <dl className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Total Plafon Diajukan</dt>
                  <dd className="font-bold text-slate-900">{formatCurrency(amountRequested)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-slate-500">Total Realisasi Terpakai</dt>
                  <dd className="font-bold text-slate-900">{formatCurrency(totalSpent)}</dd>
                </div>
              </dl>
            </div>
            <button
              type="submit"
              form="return-form"
              disabled={submitting}
              className="w-full rounded-full bg-dark-navy py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? "Menyimpan..." : "Kirim Pengembalian"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="w-full rounded-full border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
          </aside>
        </div>
      )}

      {showReimburseForm && (
        <form
          onSubmit={handleSubmitReimbursement}
          className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
        >
          <p className="text-sm font-semibold text-slate-700">
            Catat Penggantian ke Requester
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nominal Diganti (Rp)
            </label>
            <CurrencyInput
              required
              value={reimburseAmount}
              onValueChange={setReimburseAmount}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Catatan (opsional)
            </label>
            <input
              type="text"
              value={reimburseNote}
              onChange={(e) => setReimburseNote(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Bukti Transfer
            </label>
            <button
              type="button"
              onClick={() => reimburseFileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl py-4 text-slate-500 text-sm"
            >
              <Upload size={16} />
              {reimburseFile ? reimburseFile.name : "Unggah foto bukti transfer"}
            </button>
            <input
              ref={reimburseFileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              onChange={async (e) => {
                const raw = e.target.files?.[0];
                e.target.value = "";
                setReimburseFile(raw ? await toJpegFile(raw) : null);
              }}
              className="hidden"
            />
            <LocalFilePreview file={reimburseFile} className="mt-2" />
          </div>
          <button
            type="submit"
            disabled={reimbursing}
            className="w-full bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-medium rounded-lg py-2.5 transition-colors"
          >
            {reimbursing ? "Menyimpan..." : "Simpan Penggantian"}
          </button>
        </form>
      )}

      {showDirectClose && (
        <button
          onClick={handleCloseDirect}
          disabled={closing}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-medium rounded-xl py-3"
        >
          {closing ? "Menutup..." : "Tutup Pengajuan (Tidak Ada Sisa Saldo)"}
        </button>
      )}

      {status === "closed" && (
        <div className="space-y-2">
          {reportUrl ? (
            <FilePreviewLink
              url={reportUrl}
              title="Laporan penutupan"
              className="w-full flex items-center justify-center gap-2 border border-brand text-brand font-medium rounded-xl py-3"
            >
              <Eye size={16} />
              Lihat Laporan
            </FilePreviewLink>
          ) : null}
          {reportUrl && (
            <button
              onClick={async () => {
                setError("");
                await archiveReport({ force: true });
                router.refresh();
              }}
              disabled={archiving}
              className="w-full text-xs font-medium text-slate-500 hover:text-brand disabled:opacity-60 py-1"
            >
              {archiving
                ? "Membuat ulang laporan..."
                : "Perbarui laporan di Drive (buat ulang dari data terbaru)"}
            </button>
          )}
          {!reportUrl && (
            <button
              onClick={async () => {
                setError("");
                await archiveReport();
                router.refresh();
              }}
              disabled={archiving}
              className="w-full flex items-center justify-center gap-2 border border-brand text-brand disabled:opacity-60 font-medium rounded-xl py-3"
            >
              <Upload size={16} />
              {archiving ? "Menyimpan laporan ke Drive..." : "Simpan Laporan ke Drive"}
            </button>
          )}
          <a
            href={`/api/cash-advances/${cashAdvanceId}/report`}
            className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-medium rounded-xl py-3"
          >
            <FileText size={16} />
            Unduh Laporan (PDF)
          </a>
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl py-3"
          >
            <Download size={16} />
            Unduh Data (CSV)
          </button>
        </div>
      )}
    </div>
  );
}
