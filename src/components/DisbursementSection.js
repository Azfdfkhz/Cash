"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Check, Copy, Eye, FileText, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toJpegFile } from "@/lib/imageConvert";
import { DriveInlinePreview, FilePreviewLink, LocalFilePreview } from "@/components/FilePreview";
import { formatBankAccount, formatCurrency, formatDate } from "@/lib/utils";

// Baris "label — nilai — [Salin]" supaya operasional tidak perlu mengetik ulang
// di aplikasi bank.
function CopyRow({ label, value, copyValue, strong = false }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(String(copyValue ?? value));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard tidak tersedia: nilai tetap bisa diseleksi manual */
    }
  }
  return (
    <div className="flex items-center gap-3 border-t border-slate-100 px-1 py-2.5 first:border-t-0">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-600">{label}</p>
        <p
          className={`select-all break-words text-sm text-slate-900 ${
            strong ? "font-bold tabular-nums tracking-wide" : "font-semibold"
          }`}
        >
          {value || "-"}
        </p>
      </div>
      {value ? (
        <button
          type="button"
          onClick={copy}
          aria-label={`Salin ${label}`}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          {copied ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
          {copied ? "Tersalin" : "Salin"}
        </button>
      ) : null}
    </div>
  );
}

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
  // Dipanggil setelah pencairan tersimpan (sebelum data di-refresh).
  onDone,
  // Bukti transfer yang sudah dipilih dari luar (mis. langsung setelah menekan
  // "Cairkan Sekarang"), jadi operasional tidak perlu memilih file lagi.
  externalFile = null,
}) {
  const isReimbursement = kind === "reimbursement";
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [pickedFile, setFile] = useState(null);
  // Setelah bukti ditolak karena duplikat, file kiriman luar tidak dipakai lagi.
  const [dropExternal, setDropExternal] = useState(false);
  const file = pickedFile ?? (dropExternal ? null : externalFile) ?? null;
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  // Ref sinkron: cegah klik ganda super cepat pada tombol konfirmasi
  // mencairkan dana dua kali sebelum `saving` membuatnya disabled.
  const busyRef = useRef(false);

  if (disbursedAt) {
    return (
      <div className="border-t border-slate-200 pt-5">
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
              <DriveInlinePreview
                url={proofUrl}
                title="Bukti transfer pencairan"
                className="mt-2"
              />
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
      <div className="border-t border-slate-200 pt-5 text-sm leading-relaxed text-amber-800">
        {isReimbursement
          ? "Disetujui, menunggu transfer reimbursement dari Tim Operasional ke"
          : "Disetujui, menunggu pencairan dana dari Tim Operasional ke"}{" "}
        {formatBankAccount({ bankName, bankAccountNumber, bankAccountHolder })}.
      </div>
    );
  }

  // Klik pertama hanya membuka konfirmasi; pencairan tidak bisa dibatalkan.
  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Unggah bukti transfer pencairan terlebih dahulu.");
      return;
    }
    setConfirming(true);
  }

  async function doDisburse() {
    if (busyRef.current) return;
    busyRef.current = true;
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
          proof_sha256: uploadData.proofSha256 ?? null,
          proof_phash: uploadData.proofPhash ?? null,
        }
      );
      if (rpcError) {
        throw new Error(
          rpcError.code === "23505"
            ? "Bukti transfer ini sudah pernah dipakai pada pengajuan lain. Gunakan bukti transfer yang berbeda."
            : rpcError.message
        );
      }

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

      onDone?.();
      router.refresh();
    } catch (err) {
      setError(err.message || "Gagal menyimpan pencairan. Coba lagi.");
      if (/sudah pernah dipakai/i.test(err.message || "")) {
        setFile(null);
        setDropExternal(true);
      }
      setConfirming(false);
      busyRef.current = false; // izinkan coba lagi setelah gagal
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 border-t border-slate-200 pt-5"
    >
      <div>
        <p className="text-sm font-semibold text-slate-700">
          {isReimbursement ? "Transfer Reimbursement" : "Cairkan Dana"}
        </p>
        <p className="mt-0.5 text-xs text-slate-600">
          Transfer ke rekening di bawah, unggah bukti transfer, lalu konfirmasi. Requester akan
          mendapat notifikasi.
          {isReimbursement && " Pengajuan otomatis selesai setelah dikonfirmasi."}
        </p>
      </div>

      <div className="border-y border-slate-100">
        <CopyRow label="Jumlah transfer" value={formatCurrency(amount)} copyValue={Math.round(Number(amount))} strong />
        <CopyRow label="Bank" value={bankName} />
        <CopyRow label="No. rekening" value={bankAccountNumber} strong />
        <CopyRow label="Atas nama" value={bankAccountHolder} />
      </div>

      {error && (
        <div role="alert" className="font-medium text-sm text-rose-800 bg-rose-50 rounded-md px-3 py-2">
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
        disabled={saving || !file}
        title={!file ? "Unggah bukti transfer dulu" : undefined}
        className="w-full flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-dark disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg py-2.5 lg:rounded-full lg:bg-dark-navy lg:font-semibold lg:hover:bg-slate-800"
      >
        <Banknote size={16} />
        {saving
          ? "Menyimpan..."
          : isReimbursement
            ? "Konfirmasi Transfer"
            : "Konfirmasi Pencairan"}
      </button>

      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Konfirmasi pencairan"
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">
              {isReimbursement ? "Konfirmasi transfer?" : "Konfirmasi pencairan?"}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Anda sudah mentransfer{" "}
              <span className="font-bold text-slate-900">{formatCurrency(amount)}</span> ke{" "}
              <span className="font-semibold">{bankName}</span> a.n.{" "}
              <span className="font-semibold">{bankAccountHolder}</span>. Setelah dikonfirmasi,
              status berubah dan requester langsung diberi tahu. Tindakan ini tidak bisa
              dibatalkan.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={saving}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Periksa lagi
              </button>
              <button
                type="button"
                onClick={doDisburse}
                disabled={saving}
                className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Ya, sudah ditransfer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
