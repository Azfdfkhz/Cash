"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, Eye, FileText, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CurrencyInput from "@/components/CurrencyInput";
import { DriveInlinePreview, FilePreviewLink, LocalFilePreview } from "@/components/FilePreview";
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
  // false = dana belum dicairkan: belum ada sisa saldo yang bisa dikembalikan.
  disbursed = true,
  amountRequested = 0,
  totalSpent = 0,
  // Dipanggil setelah pengembalian tersimpan (dipakai ReturnPopup untuk
  // menampilkan status pengembalian).
  onReturnSubmitted,
}) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const initialRemaining = balance - totalReturned;
  const [amount, setAmount] = useState(initialRemaining > 0 ? String(initialRemaining) : "");
  const [returnDate, setReturnDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [copiedAcc, setCopiedAcc] = useState(null);
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

  const remaining = disbursed ? balance - totalReturned : 0;
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
    if (numericAmount > Math.max(remaining, 0)) {
      setError("Nominal melebihi sisa saldo yang perlu dikembalikan.");
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
          return_date: returnDate || null,
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

  async function copyAccount(number) {
    try {
      await navigator.clipboard.writeText(number);
      setCopiedAcc(number);
      setTimeout(() => setCopiedAcc((cur) => (cur === number ? null : cur)), 2000);
    } catch {
      /* clipboard tidak tersedia: nomor tetap bisa diblok manual (select-all) */
    }
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
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Pengembalian Sisa Saldo
          </h2>

          {remaining > 0 && !showReturnForm && (
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
                  {r.proof_drive_view_url && (
                    <DriveInlinePreview
                      url={r.proof_drive_view_url}
                      title={`Bukti transfer ${formatCurrency(r.amount)}`}
                      variant="thumb"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">
                      {formatCurrency(r.amount)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(r.return_date ?? r.created_at)}
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
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
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
                  {r.proof_drive_view_url && (
                    <DriveInlinePreview
                      url={r.proof_drive_view_url}
                      title={`Bukti transfer ${formatCurrency(r.amount)}`}
                      variant="thumb"
                    />
                  )}
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
        <form id="return-form" onSubmit={handleSubmitReturn} className="space-y-7">
          {/* Sisa dana */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
            <p className="text-sm text-slate-500">Sisa dana yang perlu dikembalikan</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
              {formatCurrency(Math.max(remaining, 0))}
            </p>
            <dl className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-500">Total Plafon Diajukan</dt>
                <dd className="font-bold text-slate-900">{formatCurrency(amountRequested)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-500">Total Realisasi Terpakai</dt>
                <dd className="font-bold text-slate-900">{formatCurrency(totalSpent)}</dd>
              </div>
            </dl>
          </div>

          {/* Jumlah */}
          <div className="space-y-2.5">
            <label className="block text-sm font-bold text-slate-900">Jumlah yang Dikembalikan</label>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white py-2 pl-4 pr-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <span className="font-semibold text-slate-400">Rp</span>
              <CurrencyInput
                required
                value={amount}
                onValueChange={setAmount}
                className="min-w-0 flex-1 border-0 bg-transparent py-2 font-bold text-slate-900 outline-none focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setAmount(String(Math.max(remaining, 0)))}
                className="shrink-0 rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                Semua
              </button>
            </div>
            <p className="text-xs text-slate-500">Maksimal pengembalian sebesar sisa saldo.</p>
          </div>

          {/* Metode */}
          <div className="space-y-2.5">
            <label className="block text-sm font-bold text-slate-900">Metode Pengembalian</label>
            <p className="text-xs text-slate-500">
              Transfer ke salah satu rekening berikut, lalu unggah bukti transfernya.
            </p>
            <div className="space-y-3">
              {COMPANY_RETURN_ACCOUNTS.map((acc) => (
                <div
                  key={acc.number}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs text-slate-500">
                      {acc.bank} · a.n. {acc.holder}
                    </p>
                    <p className="mt-1 select-all text-base font-bold tracking-wide text-slate-900">
                      {acc.number}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyAccount(acc.number)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
                  >
                    {copiedAcc === acc.number ? (
                      <>
                        <Check size={14} className="text-emerald-600" /> Tersalin
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Salin
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tanggal */}
          <div className="space-y-2.5">
            <label htmlFor="return-date" className="block text-sm font-bold text-slate-900">
              Tanggal Pengembalian
            </label>
            <input
              id="return-date"
              type="date"
              required
              value={returnDate}
              max={new Date().toLocaleDateString("en-CA")}
              onChange={(e) => setReturnDate(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-semibold text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          {/* Bukti */}
          <div className="space-y-2.5">
            <label className="block text-sm font-bold text-slate-900">Bukti Transfer Bank</label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-4 text-left hover:border-slate-400 hover:bg-slate-50"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                {file ? <FileText size={20} /> : <Upload size={20} />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-slate-900">
                  {file ? file.name : "Pilih atau Unggah Dokumen"}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {file
                    ? `${(file.size / (1024 * 1024)).toFixed(1)} MB · ketuk untuk mengganti`
                    : "JPG, PNG, atau PDF · Maks 5 MB"}
                </span>
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif,application/pdf"
              onChange={async (e) => {
                const raw = e.target.files?.[0];
                e.target.value = "";
                if (!raw) return setFile(null);
                const converted = await toJpegFile(raw);
                if (converted.size > 5 * 1024 * 1024) {
                  setFile(null);
                  setError("Ukuran file maksimal 5 MB.");
                  return;
                }
                setError("");
                setFile(converted);
              }}
              className="hidden"
            />
            <LocalFilePreview file={file} className="mt-1" />
          </div>

          {/* Catatan */}
          <div className="space-y-2.5">
            <label htmlFor="return-note" className="block text-sm font-bold text-slate-900">
              Catatan Tambahan <span className="font-normal text-slate-400">(Opsional)</span>
            </label>
            <textarea
              id="return-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Sisa dana kegiatan telah ditransfer dari rekening orang"
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          {/* Tombol kirim menempel di bawah area gulir */}
          <div className="sticky bottom-0 z-10 -mx-6 -mb-5 border-t border-slate-100 bg-white px-6 py-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#0f172a] py-3.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? "Menyimpan..." : "Kirim Pengembalian"}
            </button>
          </div>
        </form>
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
        <div className="space-y-2.5">
          <h2 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Laporan</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {reportUrl ? (
              <FilePreviewLink
                url={reportUrl}
                title="Laporan penutupan"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Eye size={15} />
                Lihat Laporan
              </FilePreviewLink>
            ) : (
              <button
                onClick={async () => {
                  setError("");
                  await archiveReport();
                  router.refresh();
                }}
                disabled={archiving}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <Upload size={15} />
                {archiving ? "Menyimpan..." : "Simpan ke Drive"}
              </button>
            )}
            <a
              href={`/api/cash-advances/${cashAdvanceId}/report`}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              <FileText size={15} />
              Unduh PDF
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-brand"
            >
              <Download size={13} />
              Unduh data (CSV)
            </button>
            {reportUrl && (
              <button
                onClick={async () => {
                  setError("");
                  await archiveReport({ force: true });
                  router.refresh();
                }}
                disabled={archiving}
                title="Buat ulang laporan di Drive dari data terbaru"
                className="font-medium text-slate-400 hover:text-brand disabled:opacity-60"
              >
                {archiving ? "Membuat ulang laporan..." : "Perbarui laporan di Drive"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
