"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Eye, FileText, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toJpegFile } from "@/lib/imageConvert";
import { LocalFilePreview } from "@/components/FilePreview";
import { FilePreviewLink } from "@/components/FilePreview";
import { formatBankAccount, formatCurrency, formatDate } from "@/lib/utils";

// Pencairan dana CA yang sudah disetujui: Tim Operasional (bukan pemilik
// pengajuan) mengunggah bukti transfer ke rekening requester, lalu requester
// dapat notifikasi Telegram.
export default function DisbursementSection({
  cashAdvanceId,
  amount,
  bankName,
  bankAccountNumber,
  bankAccountHolder,
  disbursedAt,
  disbursedByName,
  proofUrl,
  note: savedNote,
  canDisburse,
  kind,
}) {
  const isReimbursement = kind === "reimbursement";
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (disbursedAt) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Banknote size={20} className="text-emerald-700 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-800">
              {isReimbursement ? "Reimbursement sudah ditransfer" : "Dana sudah dicairkan"}
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">
              {formatCurrency(amount)} ke{" "}
              {formatBankAccount({ bankName, bankAccountNumber, bankAccountHolder })}
            </p>
            <p className="text-xs text-emerald-700/80 mt-0.5">
              {formatDate(disbursedAt)}
              {disbursedByName ? ` oleh ${disbursedByName}` : ""}
            </p>
            {savedNote && (
              <p className="text-xs text-emerald-700/80 mt-0.5">
                Catatan: {savedNote}
              </p>
            )}
            {proofUrl && (
              <FilePreviewLink
                url={proofUrl}
                title="Bukti transfer pencairan"
                className="text-xs font-medium text-emerald-800 inline-flex items-center gap-1 mt-1.5 underline"
              >
                Lihat bukti transfer <Eye size={12} />
              </FilePreviewLink>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!canDisburse) {
    return (
      <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        {isReimbursement
          ? "Disetujui, menunggu transfer reimbursement dari Tim Operasional ke"
          : "Disetujui, menunggu pencairan dana dari Tim Operasional ke"}{" "}
        {formatBankAccount({ bankName, bankAccountNumber, bankAccountHolder })}.
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Unggah bukti transfer pencairan terlebih dahulu.");
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("cashAdvanceId", cashAdvanceId);
      formData.append("kind", "bukti-pencairan");
      const uploadRes = await fetch("/api/drive/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);

      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc(
        "mark_cash_advance_disbursed",
        {
          target_id: cashAdvanceId,
          file_id: uploadData.fileId,
          view_url: uploadData.viewUrl,
          note: note.trim() || null,
        }
      );
      if (rpcError) throw new Error(rpcError.message);

      fetch(`/api/cash-advances/${cashAdvanceId}/notify-disbursed`, {
        method: "POST",
      }).catch(() => {});

      // Reimbursement langsung selesai setelah ditransfer -> simpan laporan
      // ke Drive seperti penutupan CA. Kalau gagal, tombol "Simpan Laporan
      // ke Drive" muncul untuk dicoba ulang.
      if (isReimbursement) {
        await fetch(`/api/cash-advances/${cashAdvanceId}/report`, {
          method: "POST",
        }).catch(() => {});
      }

      router.refresh();
    } catch (err) {
      setError(err.message || "Gagal menyimpan pencairan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 lg:rounded-2xl lg:p-5"
    >
      <div>
        <p className="text-sm font-semibold text-slate-700">
          {isReimbursement ? "Transfer Reimbursement" : "Cairkan Dana"}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          Transfer {formatCurrency(amount)} ke{" "}
          {formatBankAccount({ bankName, bankAccountNumber, bankAccountHolder })},
          lalu unggah bukti transfernya. Requester akan mendapat notifikasi.
          {isReimbursement && " Pengajuan otomatis selesai setelah dikonfirmasi."}
        </p>
      </div>

      {error && (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-lg py-4 text-sm text-slate-600"
      >
        {file ? (
          <>
            <FileText size={16} />
            <span className="truncate max-w-[80%]">{file.name}</span>
          </>
        ) : (
          <>
            <Upload size={16} /> Pilih bukti transfer (foto / PDF)
          </>
        )}
      </button>
      <LocalFilePreview file={file} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif,application/pdf"
        onChange={async (e) => {
          const raw = e.target.files?.[0];
          e.target.value = "";
          setFile(raw ? await toJpegFile(raw) : null);
        }}
        className="hidden"
      />

      <textarea
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Catatan untuk requester (opsional)"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 lg:rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
      />

      <button
        type="submit"
        disabled={saving}
        className="w-full flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2.5 lg:rounded-full lg:bg-dark-navy lg:font-semibold lg:hover:bg-slate-800"
      >
        <Banknote size={16} />
        {saving
          ? "Menyimpan..."
          : isReimbursement
            ? "Konfirmasi Transfer"
            : "Konfirmasi Pencairan"}
      </button>
    </form>
  );
}
