"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Plus,
  Check,
  ChevronUp,
  ChevronDown,
  Calendar,
  ExternalLink,
  Clock,
  FileSpreadsheet,
  Banknote,
  Eye,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import CashAdvanceDetailPopup from "@/components/CashAdvanceDetailPopup";
import {
  formatCurrency,
  formatDateTimeFull,
  formatBankAccount,
  formatCaCode,
  formatLpjDeadline,
  FUNDING_SOURCE_LABEL,
  KIND_LABEL,
} from "@/lib/utils";

export default function CashAdvanceReviewModal(props) {
  const { isOpen, onClose, ca } = props;

  // Lock scroll & handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || !ca) return null;

  return <CashAdvanceReviewModalContent key={ca.id} {...props} />;
}

function CashAdvanceReviewModalContent({
  onClose,
  ca,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  currentUserId,
  canReview = false,
  onDecisionComplete,
  nextPendingCount = 0,
  onGoNext,
  startWithDetail = false,
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Setelah setuju/tolak: modal TIDAK pindah sendiri. Pop up hasil muncul dulu;
  // pindah ke pengajuan lain hanya jika user memilih "Lanjut".
  // step: "disburse" (tanya cairkan sekarang/nanti) -> "continue" (tanya lanjut).
  const [result, setResult] = useState(null);
  const [decidedHere, setDecidedHere] = useState(false);
  const [detailOpen, setDetailOpen] = useState(startWithDetail);
  const [detailFocus, setDetailFocus] = useState(null);
  const [askContinueAfterDetail, setAskContinueAfterDetail] = useState(false);
  const overlayRef = useRef(null);

  const isOwner = ca.requester_id === currentUserId;
  const isPending = ca.status === "pending";
  // true hanya selama modal ini sendiri yang baru memutuskan (bukan buka riwayat lama)
  const justDecided = decidedHere;
  // Hanya operasional yang boleh memutuskan, dan bukan pengajuan miliknya sendiri.
  const canDecide = canReview && isPending && !isOwner;

  const isReimbursement = ca.kind === "reimbursement";
  const awaitingTransfer = ca.status === "approved" && !ca.disbursed_at;
  const holderName = ca.bank_account_holder || ca.profiles?.bank_account_holder || ca.profiles?.full_name || "-";

  const categoryLabel =
    (ca.funding_source && FUNDING_SOURCE_LABEL[ca.funding_source]) ||
    (ca.objective ? `Kas ${ca.objective}` : "Kas Operasional");
  const categoryFull = ca.program_ref
    ? `${categoryLabel} · ${ca.program_ref}`
    : categoryLabel;

  async function handleDecide(status) {
    setError("");
    if (status === "rejected" && !note.trim()) {
      setError("Catatan wajib diisi jika menolak pengajuan.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: updateError } = await supabase
      .from("cash_advances")
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_note: note.trim() || null,
      })
      .eq("id", ca.id);

    setLoading(false);

    if (updateError) {
      setError("Gagal memperbarui status pengajuan.");
      return;
    }

    // Trigger notification webhook in background
    fetch(`/api/cash-advances/${ca.id}/notify-decision`, {
      method: "POST",
    }).catch(() => {});

    if (onDecisionComplete) {
      onDecisionComplete(ca.id, status, note.trim() || null);
      setDecidedHere(true);
      setResult({
        status,
        step: status === "approved" ? "disburse" : "continue",
      });
      // Tidak ada pengajuan lain & ditolak -> cukup tampilkan hasil di modal.
      if (status === "rejected" && nextPendingCount === 0) setResult(null);
    } else {
      router.refresh();
      onClose();
    }
  }

  // Hapus ?ca= dari URL (dipasang saat dibuka dari tautan / sebelum ke halaman scan).
  function stripCaParam() {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("ca")) return;
    url.searchParams.delete("ca");
    window.history.replaceState(window.history.state, "", url);
  }

// Catat kwitansi = halaman scan terpisah. Tandai URL dengan ?ca= supaya
  // tombol kembali di sana membuka modal + detail ini lagi.
  function goScan() {
    const url = new URL(window.location.href);
    url.searchParams.set("ca", ca.id);
    window.history.replaceState(window.history.state, "", url);
    router.push(`/cash-advances/${ca.id}/scan`);
  }

  function afterDisburseChoice() {
    setResult(nextPendingCount > 0 ? { status: "approved", step: "continue" } : null);
  }

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current && !result && !detailOpen) {
      onClose();
    }
  }

  const lbl = "text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1.5";

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="animate-fade-in fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-[2px]"
      aria-modal="true"
      role="dialog"
    >
      <div className="max-sm:animate-sheet-up sm:animate-slide-in-right relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-[420px] sm:rounded-l-[20px] sm:border-l sm:border-slate-200/80">
        {/* ── Header: kode + status sebaris, judul di bawah ── */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1">
            <div className="flex flex-nowrap items-center gap-1.5">
              <span className="shrink-0 rounded bg-[#eff6ff] px-1.5 py-0.5 text-[10px] font-bold text-[#2563eb]">
                {formatCaCode(ca)}
              </span>
              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                {KIND_LABEL[ca.kind] ?? "Cash Advance"}
              </span>
              {isPending ? (
                <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[#fde8c3] bg-[#fff9ed] px-2 py-px text-[10px] font-semibold text-[#b45309]">
                  <span className="h-1 w-1 rounded-full bg-[#f59e0b]" />
                  Menunggu Verifikasi
                </span>
              ) : (
                <StatusBadge status={ca.status} className="!px-2 !py-px !text-[10px] whitespace-nowrap" />
              )}
            </div>
            <h2 className="mt-1.5 truncate text-sm font-bold tracking-tight text-slate-900">
              {ca.purpose}
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev || loading}
              aria-label="Pengajuan sebelumnya"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronUp size={14} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext || loading}
              aria-label="Pengajuan berikutnya"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronDown size={14} strokeWidth={2} />
            </button>
            <div className="mx-0.5 h-4 w-px bg-slate-200" />
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              aria-label="Tutup"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {!isPending && ca.reviewed_at && justDecided && (
            <div
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-semibold ${
                ca.status === "approved"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {ca.status === "approved" ? <Check size={14} /> : <X size={14} />}
              {ca.status === "approved"
                ? "Pengajuan disetujui."
                : "Pengajuan ditolak."}
            </div>
          )}
          {/* Plafon + tenggat (sebaris seperti desain) */}
          <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-slate-50/60 p-3">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                {isReimbursement ? "NOMINAL DIAJUKAN" : "PLAFON DIAJUKAN"}
              </p>
              <p className="mt-0.5 text-lg font-extrabold leading-tight tracking-tight text-slate-900">
                {formatCurrency(ca.amount_requested)}
              </p>
              {!isReimbursement && (
                <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500">
                  Kategori: {categoryFull}
                </p>
              )}
            </div>
            {!isReimbursement && (
            <div className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
              <Calendar size={13} strokeWidth={2} className="text-[#2563eb]" />
              <div>
                <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  TENGGAT LPJ / SPJ
                </p>
                <p className="text-[11px] font-bold text-slate-900">
                  {formatLpjDeadline(ca)}
                </p>
              </div>
            </div>
            )}
          </div>

          {/* Pemohon & rekening berdampingan */}
          <div className="grid grid-cols-[1fr_1.4fr] gap-2">
            <div className="rounded-xl border border-slate-200/90 bg-white p-2.5">
              <p className="text-[10px] font-medium text-slate-400">Nama Pemohon</p>
              <p className="mt-0.5 break-words text-xs font-bold text-slate-900">
                {ca.profiles?.full_name || "-"}
              </p>
            </div>
            <div className="min-w-0 rounded-xl border border-slate-200/90 bg-white p-2.5">
              <div className="flex items-start justify-between gap-1">
                <p className="text-[10px] font-medium text-slate-400">{isReimbursement ? "Rekening Penggantian" : "Rekening Pencairan"}</p>
                {(ca.bank_name || ca.bank_account_number) && (
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-emerald-200 bg-[#ebf9f0] px-1 py-px text-[9px] font-semibold text-[#1fa653]">
                    <Check size={9} strokeWidth={3} />
                    Terverifikasi
                  </span>
                )}
              </div>
              <p className="mt-0.5 break-words text-xs font-bold text-slate-900">
                {[ca.bank_name, ca.bank_account_number].filter(Boolean).join(" ") || "-"}
              </p>
              <p className="text-[10px] text-slate-500">a.n {holderName}</p>
            </div>
          </div>

          <div>
            <p className={lbl}>RINCIAN KEPERLUAN PENGAJUAN</p>
            <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-2.5 text-xs leading-relaxed text-slate-700">
              {ca.purpose}
            </div>
          </div>

          {!isReimbursement ? (
          <div>
            <p className={lbl}>LAMPIRAN RAB & NOTA ESTIMASI</p>
            {ca.rab_url ? (
              <a
                href={ca.rab_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-2 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-[#eafaf1] text-[#12a150]">
                    <FileSpreadsheet size={16} strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Link Spreadsheet</p>
                    <p className="text-[10px] text-slate-400">Spreadsheet Google Sheets</p>
                  </div>
                </div>
                <ExternalLink size={14} strokeWidth={2} className="mr-1 text-slate-400 group-hover:text-slate-600" />
              </a>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-2.5 text-center text-[11px] text-slate-400">
                Tidak ada link spreadsheet.
              </div>
            )}
            <p className="mt-1.5 text-[10px] text-slate-400">
              Rincian pos RAB lengkap ada di{" "}
              <button type="button" onClick={() => setDetailOpen(true)} className="font-semibold text-brand hover:underline">
                Lihat Detail
              </button>
              .
            </p>
          </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-2.5 text-center text-[11px] text-slate-500">
              Kwitansi reimbursement dilihat di detail pengajuan.
            </div>
          )}

          {canDecide ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="review-note-input" className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  CATATAN <span className="font-semibold text-rose-500">(WAJIB DIISI JIKA MENOLAK)</span>
                </label>
                <span className="text-[10px] text-slate-400">Opsional untuk persetujuan</span>
              </div>
              <textarea
                id="review-note-input"
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  if (error) setError("");
                }}
                rows={2}
                placeholder="Tulis catatan verifikasi atau alasan spesifik jika pengajuan ini ditolak..."
                className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
              />
              {error && <p className="mt-1 text-[11px] font-semibold text-rose-600">{error}</p>}
            </div>
          ) : (
            !isPending && (
              <div>
                <p className={lbl}>CATATAN OPERASIONAL</p>
                <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 px-3 py-2.5 text-xs leading-relaxed text-slate-700">
                  {ca.review_note || <span className="text-slate-400">Tidak ada catatan.</span>}
                </div>
              </div>
            )
          )}

          <div className="space-y-1 text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock size={12} strokeWidth={1.75} />
              <span>Diajukan pada {formatDateTimeFull(ca.created_at)}</span>
            </div>
            {ca.reviewed_at && !isPending && (
              <div className="flex items-center gap-1.5">
                <Check size={12} strokeWidth={1.75} />
                <span>Ditinjau pada {formatDateTimeFull(ca.reviewed_at)}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-slate-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {canDecide ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDetailOpen(true)}
                className="mr-auto flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Eye size={14} strokeWidth={2.25} />
                Lihat Detail
              </button>
              <button
                type="button"
                onClick={() => handleDecide("rejected")}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 rounded-full border border-rose-400 bg-white px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50 transition-colors"
              >
                <X size={14} strokeWidth={2.5} />
                Tolak
              </button>
              <button
                type="button"
                onClick={() => handleDecide("approved")}
                disabled={loading}
                className="flex items-center justify-center gap-1.5 rounded-full bg-[#0f172a] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                <Check size={14} strokeWidth={2.5} />
                Setujui Pengajuan
              </button>
            </div>
          ) : isPending ? (
            <div className="space-y-2">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[11px] font-semibold text-amber-800">
                {isOwner && canReview
                  ? "Menunggu persetujuan admin lain. Anda tidak bisa menyetujui pengajuan sendiri."
                  : "Menunggu verifikasi tim operasional."}
              </div>
              <button
                type="button"
                onClick={() => setDetailOpen(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Eye size={14} strokeWidth={2.25} />
                Lihat Detail
              </button>
            </div>
          ) : isOwner && ca.status === "approved" && !isReimbursement ? (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDetailFocus("pengembalian");
                  setDetailOpen(true);
                }}
                className="flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Kembalikan sisa
              </button>
              <button
                type="button"
                onClick={goScan}
                className="flex items-center justify-center gap-1.5 rounded-full bg-[#0f172a] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
              >
                <Plus size={14} strokeWidth={2.5} />
                Catat kwitansi
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  setDetailFocus(canReview && awaitingTransfer ? "pencairan" : null);
                  setDetailOpen(true);
                }}
                className="flex items-center justify-center rounded-full bg-[#0f172a] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
              >
                {canReview && awaitingTransfer
                  ? isReimbursement
                    ? "Transfer Penggantian"
                    : "Cairkan Dana"
                  : isOwner && ca.status === "rejected"
                    ? "Revisi & Ajukan Ulang"
                    : "Lihat Detail"}
              </button>
            </div>
          )}
        </div>
      </div>
      {detailOpen && (
        <CashAdvanceDetailPopup
          ca={ca}
          onClose={() => {
            setDetailOpen(false);
            setDetailFocus(null);
            stripCaParam();
            // Datang dari "Cairkan Sekarang": setelah popup ditutup, tanyakan lanjut.
            if (askContinueAfterDetail) {
              setAskContinueAfterDetail(false);
              if (nextPendingCount > 0) setResult({ status: "approved", step: "continue" });
            }
          }}
          currentUserId={currentUserId}
          isOperational={canReview}
          initialFocus={detailFocus}
        />
      )}
      {result && (
        <DecisionDialog
          result={result}
          ca={ca}
          isReimbursement={isReimbursement}
          nextPendingCount={nextPendingCount}
          onLater={afterDisburseChoice}
          onDisburseNow={() => {
            setResult(null);
            setAskContinueAfterDetail(true);
            setDetailFocus("pencairan");
            setDetailOpen(true);
          }}
          onStay={() => setResult(null)}
          onGoNext={() => {
            setResult(null);
            onGoNext?.();
          }}
        />
      )}
    </div>
  );
}

// Pop up hasil keputusan. Dua langkah, selalu menunggu pilihan user:
//  1) disetujui -> cairkan/transfer sekarang atau nanti
//  2) masih ada antrean -> lanjut ke pengajuan berikutnya atau tetap di sini
function DecisionDialog({
  result,
  ca,
  isReimbursement,
  nextPendingCount,
  onLater,
  onDisburseNow,
  onStay,
  onGoNext,
}) {
  const account = formatBankAccount({
    bankName: ca.bank_name,
    bankAccountNumber: ca.bank_account_number,
    bankAccountHolder:
      ca.bank_account_holder || ca.profiles?.bank_account_holder || ca.profiles?.full_name,
  });

  return (
    <div
      className="animate-fade-in absolute inset-0 z-10 flex items-center justify-center bg-slate-900/50 p-4"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="animate-scale-up w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        {result.step === "disburse" ? (
          <>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Banknote size={20} />
            </span>
            <h3 className="mt-3 text-sm font-bold text-slate-900">
              Pengajuan disetujui
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              {isReimbursement ? "Transfer penggantian" : "Cairkan dana"}{" "}
              <span className="font-semibold text-slate-900">
                {formatCurrency(ca.amount_requested)}
              </span>{" "}
              ke {account}. Mau dilakukan sekarang atau nanti?
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onLater}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Nanti
              </button>
              <button
                type="button"
                onClick={onDisburseNow}
                className="rounded-full bg-[#0f172a] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                {isReimbursement ? "Transfer Sekarang" : "Cairkan Sekarang"}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-sm font-bold text-slate-900">
              {result.status === "rejected" ? "Pengajuan ditolak" : "Lanjut ke pengajuan berikutnya?"}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Masih ada{" "}
              <span className="font-semibold text-slate-900">{nextPendingCount}</span>{" "}
              pengajuan lain yang menunggu verifikasi. Pindah ke pengajuan berikutnya sekarang?
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onStay}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Tetap di sini
              </button>
              <button
                type="button"
                onClick={onGoNext}
                className="rounded-full bg-[#0f172a] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                Lanjut
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
