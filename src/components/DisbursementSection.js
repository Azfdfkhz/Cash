"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Banknote, CalendarCheck, Check, CheckCircle2, Copy, Eye, FileText, Upload, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toJpegFile } from "@/lib/imageConvert";
import { DriveInlinePreview, FilePreviewLink, LocalFilePreview } from "@/components/FilePreview";
import { formatBankAccount, formatCurrency, formatDate } from "@/lib/utils";
import { assertNotTimedOut, createRequestTimer, toTimeoutError } from "@/lib/requestTimeout";

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
  // Bukti belum dilampirkan: pesan tampil tepat di bawah kotak unggah.
  const [missingProof, setMissingProof] = useState(false);
  const proofBoxRef = useRef(null);
  const confirmBtnRef = useRef(null);
  const errorRef = useRef(null);
  // Ref sinkron: cegah klik ganda super cepat pada tombol konfirmasi
  // mencairkan dana dua kali sebelum `saving` membuatnya disabled.
  const busyRef = useRef(false);

  // Begitu bukti transfer terlampir (dipilih sendiri atau kiriman luar), layar
  // langsung menggulung ke tombol konfirmasi supaya tidak terlewat.
  useEffect(() => {
    if (!file || disbursedAt) return;
    const t = setTimeout(() => {
      confirmBtnRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 350); // tunggu pratinjau bukti selesai tampil agar posisi akhirnya tepat
    return () => clearTimeout(t);
  }, [file, disbursedAt]);

  // Pesan gagal/timeout dibawa ke layar supaya jelas harus klik ulang.
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [error]);

  if (disbursedAt) {
    // Rekening tujuan tidak diulang di sini: sudah ada di "Rekening Tujuan".
    return (
      <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-100 px-4 py-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
            <CheckCircle2 size={13} strokeWidth={2.5} />
            {isReimbursement ? "Sudah ditransfer" : "Dana sudah dicairkan"}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-900">
            <CalendarCheck size={13} />
            {formatDate(disbursedAt)}
          </span>
        </div>

        <div className="flex items-center gap-4 px-4 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-600">
              {isReimbursement ? "Nominal penggantian" : "Nominal ditransfer"}
            </p>
            <p className="mt-0.5 text-2xl font-extrabold tabular-nums tracking-tight text-slate-900">
              {formatCurrency(amount)}
            </p>
            {disbursedByName && (
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-slate-600">
                <UserRound size={13} />
                Dicairkan oleh <span className="font-semibold text-slate-800">{disbursedByName}</span>
              </p>
            )}
          </div>
          {proofUrl && (
            <DriveInlinePreview
              url={proofUrl}
              title="Bukti transfer pencairan"
              variant="thumb"
              className="!h-24 !w-24 shadow-sm"
            />
          )}
        </div>

        {savedNote && (
          <p className="mx-4 mb-4 rounded-lg bg-white px-3 py-2 text-xs leading-relaxed text-slate-700 ring-1 ring-emerald-100">
            <span className="font-semibold text-slate-900">Catatan: </span>
            {savedNote}
          </p>
        )}

        {proofUrl && (
          <FilePreviewLink
            url={proofUrl}
            title="Bukti transfer pencairan"
            className="flex items-center justify-center gap-1.5 border-t border-emerald-100 bg-emerald-50/60 px-4 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
          >
            <Eye size={13} /> Lihat bukti transfer
          </FilePreviewLink>
        )}
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
      setMissingProof(true);
      proofBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setConfirming(true);
  }

  async function doDisburse() {
    if (busyRef.current) return;
    busyRef.current = true;
    setSaving(true);
    setError("");
    // Lebih dari 15 detik belum terkirim -> hentikan dan minta klik ulang.
    // Aman diulang: pencairan yang sudah tersimpan ditolak server sebagai
    // "sudah dicairkan", dan data di-refresh agar status terbaru tampil.
    const timer = createRequestTimer();
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("cashAdvanceId", cashAdvanceId);
      formData.append("kind", "bukti-pencairan");
      const uploadRes = await fetch("/api/drive/upload", {
        method: "POST",
        body: formData,
        signal: timer.signal,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);

      const supabase = createClient();
      const { error: rpcError } = await supabase
        .rpc("mark_cash_advance_disbursed", {
          target_id: cashAdvanceId,
          file_id: uploadData.fileId,
          view_url: uploadData.viewUrl,
          note: note.trim() || null,
          proof_sha256: uploadData.proofSha256 ?? null,
          proof_phash: uploadData.proofPhash ?? null,
        })
        .abortSignal(timer.signal);
      assertNotTimedOut(timer);
      if (rpcError) {
        throw new Error(
          rpcError.code === "23505"
            ? "Bukti transfer ini sudah pernah dipakai pada pengajuan lain. Gunakan bukti transfer yang berbeda."
            : rpcError.message
        );
      }
      timer.clear();

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
      timer.clear();
      const e = toTimeoutError(err, timer);
      setError(e.message || "Gagal menyimpan pencairan. Coba lagi.");
      if (timer.timedOut) router.refresh(); // kalau ternyata sudah tersimpan, status ikut berubah
      if (/sudah pernah dipakai/i.test(e.message || "")) {
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
        <div ref={errorRef} role="alert" className="font-medium text-sm text-rose-800 bg-rose-50 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <button
        ref={proofBoxRef}
        type="button"
        onClick={() => fileInputRef.current?.click()}
        aria-invalid={missingProof ? "true" : undefined}
        className={`w-full flex items-center justify-center gap-2 border-2 border-dashed rounded-lg py-4 text-sm ${
          missingProof
            ? "border-rose-400 bg-rose-50/40 text-rose-700 ring-2 ring-rose-200"
            : "border-slate-300 text-slate-600"
        }`}
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
      {missingProof && !file && (
        <p role="alert" className="flex items-start gap-1.5 text-xs font-semibold text-rose-700">
          <AlertCircle size={14} className="mt-px shrink-0" />
          Bukti transfer belum dilampirkan. Pilih foto atau PDF bukti transfer dulu sebelum
          konfirmasi.
        </p>
      )}
      <LocalFilePreview file={file} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.heic,.heif,application/pdf"
        onChange={async (e) => {
          const raw = e.target.files?.[0];
          e.target.value = "";
          setMissingProof(false);
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

      {file && !saving && (
        <p className="flex items-start gap-1.5 text-xs font-medium text-emerald-800">
          <CheckCircle2 size={14} className="mt-px shrink-0" />
          Bukti transfer sudah terlampir. Tekan tombol konfirmasi di bawah agar requester diberi tahu.
        </p>
      )}

      <button
        ref={confirmBtnRef}
        type="submit"
        disabled={saving}
        className="w-full flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg py-2.5 lg:rounded-full lg:bg-dark-navy lg:font-semibold lg:hover:bg-slate-800"
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
