"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Download, ExternalLink, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CurrencyInput from "@/components/CurrencyInput";
import {
  formatCurrency,
  formatDate,
  toCsvValue,
  downloadCsv,
} from "@/lib/utils";

async function downloadClosureReport(supabase, cashAdvanceId) {
  const { data: ca } = await supabase
    .from("cash_advances")
    .select("*, profiles:requester_id(full_name)")
    .eq("id", cashAdvanceId)
    .single();

  const { data: receipts } = await supabase
    .from("receipts")
    .select("*")
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
    "KWITANSI REALISASI",
    ["Tanggal", "Vendor", "Nominal", "Catatan", "Link Foto"].join(","),
    ...(receipts ?? []).map((r) =>
      [
        r.receipt_date ? formatDate(r.receipt_date) : "-",
        r.vendor,
        r.amount,
        r.notes,
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
}) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [amount, setAmount] = useState(balance > 0 ? String(balance) : "");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [closing, setClosing] = useState(false);
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
  const showReturnForm = isOwner && status === "approved" && remaining > 0;
  const showReimburseForm =
    isOperational && status === "approved" && balance < 0 && deficit > 0;
  const showDirectClose =
    isOperational && status === "approved" && balance === 0;

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

      const { error: insertError } = await supabase
        .from("cash_advance_reimbursements")
        .insert({
          cash_advance_id: cashAdvanceId,
          created_by: user.id,
          amount: numericAmount,
          note: reimburseNote || null,
          proof_drive_file_id: uploadData.fileId,
          proof_drive_view_url: uploadData.viewUrl,
        });

      if (insertError) throw new Error(insertError.message);

      const { data: updatedCa } = await supabase
        .from("cash_advances")
        .select("status")
        .eq("id", cashAdvanceId)
        .single();

      if (updatedCa?.status === "closed") {
        await downloadClosureReport(supabase, cashAdvanceId);
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
      await downloadClosureReport(supabase, cashAdvanceId);
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

    await downloadClosureReport(supabase, cashAdvanceId);
    setClosing(false);
    router.refresh();
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
                      <a
                        href={r.proof_drive_view_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-brand inline-flex items-center gap-1 mt-1"
                      >
                        Lihat bukti <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                  <div className="shrink-0">
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
                      <a
                        href={r.proof_drive_view_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-brand inline-flex items-center gap-1 mt-1"
                      >
                        Lihat bukti <ExternalLink size={12} />
                      </a>
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
        <form
          onSubmit={handleSubmitReturn}
          className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
        >
          <p className="text-sm font-semibold text-slate-700">
            Ajukan Pengembalian
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nominal Dikembalikan (Rp)
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
              Catatan (opsional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Bukti Transfer
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl py-4 text-slate-500 text-sm"
            >
              <Upload size={16} />
              {file ? file.name : "Unggah foto bukti transfer"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-medium rounded-lg py-2.5 transition-colors"
          >
            {submitting ? "Menyimpan..." : "Kirim Pengembalian"}
          </button>
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
              accept="image/*"
              onChange={(e) => setReimburseFile(e.target.files?.[0] || null)}
              className="hidden"
            />
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
        <button
          onClick={handleDownload}
          className="w-full flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-xl py-3"
        >
          <Download size={16} />
          Unduh Laporan
        </button>
      )}
    </div>
  );
}
