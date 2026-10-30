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
  Hourglass,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isDemoCa } from "@/lib/tour/demoData";
import StatusBadge from "@/components/StatusBadge";
import CashAdvanceDetailPopup from "@/components/CashAdvanceDetailPopup";
import ScanReceiptPopup from "@/components/ScanReceiptPopup";
import ReturnPopup from "@/components/ReturnPopup";
import ReopenDialog from "@/components/ReopenDialog";
import ReopenNotice, { isReopened } from "@/components/ReopenNotice";
import DisbursementSection from "@/components/DisbursementSection";
import ActionToast from "@/components/ActionToast";
import { useModalState } from "@/lib/useModalState";
import { MODAL } from "@/lib/modalState";
import { toJpegFile } from "@/lib/imageConvert";
import {
  formatCurrency,
  formatDateTimeFull,
  formatBankAccount,
  formatCaCode,
  requesterName,
  formatLpjDeadline,
  FUNDING_SOURCE_LABEL,
  KIND_LABEL,
  hasPendingReturn,
} from "@/lib/utils";

export default function CashAdvanceReviewModal(props) {
  const { isOpen, ca } = props;

  // Kunci scroll halaman di belakang. Tombol Escape ditangani di dalam
  // CashAdvanceReviewModalContent karena harus tahu modal mana yang sedang aktif.
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

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
  onDisbursed,
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // SATU modal aktif pada satu waktu (lihat lib/modalState.js): detail, catat
  // kwitansi, kembalikan sisa, dan konfirmasi keputusan. Membuka salah satunya
  // otomatis menggantikan yang lain, jadi tidak perlu menutup modal lain di
  // setiap tombol.
  //
  // Setelah setuju/tolak: panel tidak pindah sendiri. Modal "decision" muncul
  // dulu; pindah ke pengajuan lain hanya jika user memilih "Lanjut".
  // decision.step: "disburse" (tanya cairkan sekarang/nanti) -> "continue" (tanya lanjut).
  const modals = useModalState(startWithDetail ? { name: MODAL.DETAIL, focus: null } : null);
  const [decidedHere, setDecidedHere] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  // Hasil aksi (berhasil/gagal) yang tampil setelah sebuah modal tertutup.
  const [notice, setNotice] = useState(null);
  const overlayRef = useRef(null);
  const dismissNotice = () => setNotice(null);
  // Bukti transfer yang dipilih langsung setelah menekan "Cairkan Sekarang".
  const proofInputRef = useRef(null);
  const [proofFile, setProofFile] = useState(null);
  // Ref sinkron: cegah klik ganda yang sangat cepat memicu dua keputusan
  // sekaligus sebelum tombol ter-disable oleh state `loading`.
  const decideBusyRef = useRef(false);

  const isOwner = ca.requester_id === currentUserId;
  const isPending = ca.status === "pending";
  // true hanya selama modal ini sendiri yang baru memutuskan (bukan buka riwayat lama)
  const justDecided = decidedHere;
  // Hanya operasional yang boleh memutuskan, dan bukan pengajuan miliknya sendiri.
  const canDecide = canReview && isPending && !isOwner;

  const isReimbursement = ca.kind === "reimbursement";
  const awaitingTransfer = ca.status === "approved" && !ca.disbursed_at;
  // Operasional (bukan pemilik) mencairkan langsung dari panel ini -- formulir
  // pencairan tampil di dalam panel, bukan pop up lain.
  const disburseInline = canReview && awaitingTransfer && !isOwner;
  // Requester sudah mencatat pengembalian sisa saldo, belum dikonfirmasi operasional.
  const pendingReturn = ca.status === "approved" && hasPendingReturn(ca);
  // Ops (bukan pemilik) boleh membatalkan "Selesai" untuk tinjau ulang.
  const canReopen =
    canReview && !isOwner && ca.status === "closed" && !isReimbursement && !isDemoCa(ca);
  const holderName = ca.bank_account_holder || ca.profiles?.bank_account_holder || ca.profiles?.full_name || "-";

  const categoryLabel =
    (ca.funding_source && FUNDING_SOURCE_LABEL[ca.funding_source]) ||
    (ca.objective ? `Kas ${ca.objective}` : "Kas Operasional");
  const categoryFull = ca.program_ref
    ? `${categoryLabel} · ${ca.program_ref}`
    : categoryLabel;

  async function handleDecide(status) {
    if (isDemoCa(ca)) return; // pengajuan contoh milik tur: tidak pernah disimpan
    if (decideBusyRef.current) return;
    setError("");
    if (status === "rejected" && !note.trim()) {
      setError("Catatan wajib diisi jika menolak pengajuan.");
      return;
    }

    decideBusyRef.current = true;
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
      setNotice({ type: "error", text: "Gagal memperbarui status pengajuan. Coba lagi." });
      decideBusyRef.current = false;
      return;
    }

    // Trigger notification webhook in background
    fetch(`/api/cash-advances/${ca.id}/notify-decision`, {
      method: "POST",
    }).catch(() => {});

    if (onDecisionComplete) {
      onDecisionComplete(ca.id, status, note.trim() || null);
      setDecidedHere(true);
      // Disetujui -> modal konfirmasi terbuka otomatis (cairkan sekarang/nanti).
      // Ditolak & masih ada antrean -> tanya lanjut. Ditolak & antrean kosong ->
      // cukup toast hasil; banner di panel sudah menunjukkan statusnya.
      if (status === "approved") {
        modals.open(MODAL.DECISION, { status, step: "disburse" });
      } else if (nextPendingCount > 0) {
        modals.open(MODAL.DECISION, { status, step: "continue" });
      } else {
        setNotice({ type: "success", text: "Pengajuan ditolak." });
      }
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

  function afterDisburseChoice() {
    if (nextPendingCount > 0) {
      modals.open(MODAL.DECISION, { status: "approved", step: "continue" });
    } else {
      modals.close();
    }
  }

  function closeDetail() {
    modals.close(MODAL.DETAIL);
    stripCaParam();
  }

  // Modal aktif ditutup dulu; baru bila tidak ada modal, panel ini yang tertutup.
  // Pop up berisi isian (PopupShell) menangani Escape-nya sendiri lebih dulu.
  const activeName = modals.active?.name ?? null;
  const decisionStep = modals.active?.step ?? null;
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (activeName === MODAL.DETAIL) closeDetail();
      else if (activeName === MODAL.DECISION) {
        if (decisionStep === "disburse") afterDisburseChoice();
        else modals.close();
      } else if (activeName) modals.close();
      else if (!loading) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // Handler dibuat ulang tiap render; dependensi cukup state yang menentukan cabang.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeName, decisionStep, loading, onClose, nextPendingCount, reopenOpen]);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current && !activeName) {
      onClose();
    }
  }

  const lbl = "mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600";

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="animate-fade-in fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-[2px]"
      aria-modal="true"
      role="dialog"
    >
      <div data-tour="review-panel" className="max-sm:animate-sheet-up sm:animate-slide-in-right relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:max-w-[420px] sm:rounded-l-[20px] sm:border-l sm:border-slate-200/80">
        {/* ── Header: kode + status sebaris, judul di bawah ── */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1.5">
              <span className="shrink-0 rounded bg-[#eff6ff] px-1.5 py-0.5 text-xs font-bold text-[#2563eb]">
                {formatCaCode(ca)}
              </span>
              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600">
                {KIND_LABEL[ca.kind] ?? "Cash Advance"}
              </span>
              {isPending ? (
                <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[#fde8c3] bg-[#fff9ed] px-2 py-px text-xs font-semibold text-[#b45309]">
                  <span className="h-1 w-1 rounded-full bg-[#f59e0b]" />
                  Belum Disetujui
                </span>
              ) : (
                <StatusBadge status={ca.status} className="!px-2 !py-px !text-xs whitespace-nowrap" />
              )}
            </div>
            <h2 className="mt-2 break-words text-sm font-bold leading-snug tracking-tight text-slate-900 line-clamp-2">
              {ca.purpose}
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-1 pl-1">
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
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {!isPending && ca.reviewed_at && justDecided && (
            <div
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
                ca.status === "rejected"
                  ? "bg-rose-50 text-rose-800"
                  : "bg-emerald-50 text-emerald-800"
              }`}
            >
              {/* Hanya "rejected" yang berarti ditolak. Setelah disetujui, status bisa
                  berlanjut jadi "closed" (mis. reimbursement langsung selesai saat
                  dicairkan) -- itu tetap "disetujui", bukan ditolak. */}
              {ca.status === "rejected" ? <X size={14} /> : <Check size={14} />}
              {ca.status === "rejected"
                ? "Pengajuan ditolak."
                : "Pengajuan disetujui."}
            </div>
          )}
          <ReopenNotice
            ca={ca}
            isOwner={isOwner}
            pendingReturn={hasPendingReturn(ca)}
            onFix={() => modals.open(MODAL.DETAIL, { focus: "perbaiki" })}
          />
          {pendingReturn && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold leading-snug text-amber-800">
              <Hourglass size={14} className="mt-px shrink-0" />
              {canReview
                ? "Ada pengembalian sisa saldo yang menunggu konfirmasi Anda."
                : "Pengembalian sisa saldo menunggu konfirmasi tim operasional."}
            </div>
          )}
          {/* Plafon + tenggat (sebaris seperti desain) */}
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-slate-200 pb-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                {isReimbursement ? "NOMINAL DIAJUKAN" : "PLAFON DIAJUKAN"}
              </p>
              <p className="mt-1 text-xl font-extrabold leading-tight tracking-tight text-slate-900">
                {formatCurrency(ca.amount_requested)}
              </p>
              {!isReimbursement && (
                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-600">
                  Kategori: {categoryFull}
                </p>
              )}
            </div>
            {!isReimbursement && (
            <div className="flex shrink-0 items-center gap-2.5 border-l border-slate-300 pl-4">
              <Calendar size={13} strokeWidth={2} className="text-[#2563eb]" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                  TENGGAT LPJ / SPJ
                </p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">
                  {formatLpjDeadline(ca)}
                </p>
              </div>
            </div>
            )}
          </div>

          {/* Pemohon & rekening: ditumpuk supaya teks tidak terpotong/berdesakan */}
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-slate-600">Nama Pemohon</p>
              <p className="mt-1 break-words text-sm font-bold text-slate-900">
                {requesterName(ca.profiles)}
              </p>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-xs font-medium text-slate-600">
                  {isReimbursement ? "Rekening Penggantian" : "Rekening Pencairan"}
                </p>
                {(ca.bank_name || ca.bank_account_number) && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded border border-emerald-200 bg-[#ebf9f0] px-1.5 py-px text-xs font-semibold text-[#15803d]">
                    <Check size={10} strokeWidth={3} />
                    Terverifikasi
                  </span>
                )}
              </div>
              <p className="mt-1 break-words text-sm font-bold text-slate-900">
                {[ca.bank_name, ca.bank_account_number].filter(Boolean).join(" · ") || "-"}
              </p>
              <p className="mt-0.5 text-[13px] text-slate-600">a.n {holderName}</p>
            </div>
          </div>

          <div>
            <p className={lbl}>RINCIAN KEPERLUAN PENGAJUAN</p>
            <p className="text-sm leading-relaxed text-slate-800">{ca.purpose}</p>
          </div>

          {!isReimbursement ? (
          <div>
            <p className={lbl}>LAMPIRAN RAB & NOTA ESTIMASI</p>
            {ca.rab_url ? (
              <a
                href={ca.rab_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group -mx-2 flex items-center justify-between rounded-lg px-2 py-2 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eafaf1] text-[#15803d]">
                    <FileSpreadsheet size={16} strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-900">Link Spreadsheet</p>
                    <p className="text-xs text-slate-600">Spreadsheet Google Sheets</p>
                  </div>
                </div>
                <ExternalLink size={14} strokeWidth={2} className="mr-1 text-slate-600 group-hover:text-slate-600" />
              </a>
            ) : (
              <p className="text-xs text-slate-600">Tidak ada link spreadsheet.</p>
            )}
          </div>
          ) : (
            <div className="text-xs text-slate-600">
              Kwitansi reimbursement dilihat di detail pengajuan.
            </div>
          )}

          {disburseInline && (
            <DisbursementSection
              cashAdvanceId={ca.id}
              amount={ca.amount_requested}
              bankName={ca.bank_name}
              bankAccountNumber={ca.bank_account_number}
              bankAccountHolder={holderName}
              disbursedAt={ca.disbursed_at}
              canDisburse
              kind={ca.kind}
              onDone={() => onDisbursed?.(ca.id)}
              externalFile={proofFile}
            />
          )}

          {canDecide ? (
            <div>
              <label htmlFor="review-note-input" className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Catatan
              </label>
              <p className="mb-2 mt-0.5 text-xs leading-relaxed text-slate-600">
                Wajib diisi jika menolak. Opsional untuk persetujuan.
              </p>
              <textarea
                id="review-note-input"
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  if (error) setError("");
                }}
                rows={3}
                placeholder="Tulis catatan verifikasi atau alasan spesifik jika pengajuan ini ditolak..."
                className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm placeholder:text-slate-600 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
              />
              {error && <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>}
            </div>
          ) : (
            !isPending && ca.review_note && (
              <div>
                <p className={lbl}>CATATAN OPERASIONAL</p>
                <p className="text-sm leading-relaxed text-slate-800">
                  {ca.review_note}
                </p>
              </div>
            )
          )}

          <div className="space-y-1.5 border-t border-slate-100 pt-4 text-xs text-slate-600">
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
        <div data-tour="review-actions" className="border-t border-slate-100 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {canDecide ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => modals.open(MODAL.DETAIL, { focus: null })}
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
              <div className="rounded-md bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-800">
                {isOwner && canReview
                  ? "Menunggu persetujuan admin lain. Anda tidak bisa menyetujui pengajuan sendiri."
                  : "Menunggu verifikasi tim operasional."}
              </div>
              <button
                type="button"
                onClick={() => modals.open(MODAL.DETAIL, { focus: null })}
                className="flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Eye size={14} strokeWidth={2.25} />
                Lihat Detail
              </button>
            </div>
          ) : isOwner && ca.status === "approved" && !isReimbursement ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {isReopened(ca) && (
                <button
                  type="button"
                  onClick={() => modals.open(MODAL.DETAIL, { focus: "perbaiki" })}
                  className="flex items-center justify-center gap-1.5 rounded-full bg-amber-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-amber-700"
                >
                  <Eye size={14} strokeWidth={2.25} />
                  Perbaiki Data
                </button>
              )}
              <button
                type="button"
                onClick={() => modals.open(MODAL.RETURN)}
                className="flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Kembalikan sisa
              </button>
              <button
                type="button"
                onClick={() => modals.open(MODAL.SCAN)}
                className="flex items-center justify-center gap-1.5 rounded-full bg-[#0f172a] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
              >
                <Plus size={14} strokeWidth={2.5} />
                Catat kwitansi
              </button>
            </div>
          ) : canReopen ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReopenOpen(true)}
                className="mr-auto flex items-center justify-center rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100"
              >
                Buka Kembali Pengajuan
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => modals.open(MODAL.DETAIL, { focus: null })}
                className="flex items-center justify-center gap-1.5 rounded-full bg-[#0f172a] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
              >
                <Eye size={14} strokeWidth={2.25} />
                Lihat Detail
              </button>
            </div>
          ) : disburseInline ? (
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
                onClick={() => modals.open(MODAL.DETAIL, { focus: "pencairan" })}
                className="flex items-center justify-center gap-1.5 rounded-full bg-[#0f172a] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
              >
                <Eye size={14} strokeWidth={2.25} />
                Lihat Detail
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
                  modals.open(MODAL.DETAIL, {
                    focus:
                      canReview && awaitingTransfer
                        ? "pencairan"
                        : canReview && pendingReturn
                          ? "pengembalian"
                          : null,
                  });
                }}
                className="flex items-center justify-center rounded-full bg-[#0f172a] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
              >
                {canReview && awaitingTransfer
                  ? isReimbursement
                    ? "Transfer Penggantian"
                    : "Cairkan Dana"
                  : canReview && pendingReturn
                    ? "Konfirmasi Pengembalian"
                    : isOwner && ca.status === "rejected"
                      ? "Revisi & Ajukan Ulang"
                      : "Lihat Detail"}
              </button>
            </div>
          )}
        </div>
      </div>
      {activeName === MODAL.DETAIL && (
        <CashAdvanceDetailPopup
          ca={ca}
          onClose={closeDetail}
          currentUserId={currentUserId}
          isOperational={canReview}
          initialFocus={modals.active.focus ?? null}
          // Dari detail ke "Scan Kwitansi": detail ditutup, hanya kwitansi yang tampil.
          onOpenScan={() => modals.open(MODAL.SCAN)}
        />
      )}
      {activeName === MODAL.SCAN && (
        <ScanReceiptPopup
          ca={ca}
          onClose={() => modals.close(MODAL.SCAN)}
          onSaved={() => {
            modals.close(MODAL.SCAN);
            setNotice({ type: "success", text: "Kwitansi berhasil disimpan." });
          }}
        />
      )}
      {activeName === MODAL.RETURN && (
        <ReturnPopup
          ca={ca}
          currentUserId={currentUserId}
          onClose={() => modals.close(MODAL.RETURN)}
          onOpenDetail={() => modals.open(MODAL.DETAIL, { focus: null })}
        />
      )}
      <input
        ref={proofInputRef}
        type="file"
        accept="image/*,.heic,.heif,application/pdf"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={async (e) => {
          const raw = e.target.files?.[0];
          e.target.value = "";
          if (raw) setProofFile(await toJpegFile(raw));
        }}
      />
      {activeName === MODAL.DECISION && (
        <DecisionDialog
          result={modals.active}
          ca={ca}
          isReimbursement={isReimbursement}
          nextPendingCount={nextPendingCount}
          onLater={afterDisburseChoice}
          onDisburseNow={() => {
            // Formulir pencairan sudah ada di panel ini: tutup dialog dan
            // langsung buka pemilih file bukti transfer (harus dipanggil
            // langsung dari klik user agar tidak diblokir browser).
            proofInputRef.current?.click();
            modals.close(MODAL.DECISION);
          }}
          onStay={() => modals.close(MODAL.DECISION)}
          onGoNext={() => {
            modals.close(MODAL.DECISION);
            onGoNext?.();
          }}
          // Modal persetujuan ditutup, hanya modal Detail yang tampil.
          // Setelah disetujui, "Lihat" langsung ke bagian Cairkan Dana.
          onViewDetail={() =>
            modals.open(MODAL.DETAIL, {
              focus: decisionStep === "disburse" ? "pencairan" : null,
            })
          }
        />
      )}
      {reopenOpen && (
        <ReopenDialog
          ca={ca}
          onCancel={() => setReopenOpen(false)}
          onDone={() => {
            setReopenOpen(false);
            router.refresh();
            onClose();
          }}
        />
      )}
      <ActionToast notice={notice} onDismiss={dismissNotice} />
    </div>
  );
}

// Pop up hasil keputusan. Dua langkah, selalu menunggu pilihan user:
//  1) disetujui -> cairkan/transfer sekarang atau nanti
//  2) masih ada antrean -> lanjut ke pengajuan berikutnya atau tetap di sini
export function DecisionDialog({
  result,
  ca,
  isReimbursement,
  nextPendingCount,
  onLater,
  onDisburseNow,
  onStay,
  onGoNext,
  // Menutup dialog ini dan membuka modal Detail pengajuan (hanya satu yang tampil).
  onViewDetail,
  standalone = false,
}) {
  const account = formatBankAccount({
    bankName: ca.bank_name,
    bankAccountNumber: ca.bank_account_number,
    bankAccountHolder:
      ca.bank_account_holder || ca.profiles?.bank_account_holder || ca.profiles?.full_name,
  });

  return (
    <div
      className={`animate-fade-in inset-0 flex items-center justify-center bg-slate-900/50 p-4 ${
        standalone ? "fixed z-[60]" : "absolute z-10"
      }`}
      role="alertdialog"
      aria-modal="true"
      aria-label={result.step === "disburse" ? "Pengajuan disetujui" : "Lanjut ke pengajuan berikutnya"}
    >
      <div className="animate-scale-up w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        {result.step === "disburse" ? (
          <>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
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
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              {onViewDetail && (
                <button
                  type="button"
                  onClick={onViewDetail}
                  className="mr-auto rounded-full px-3 py-2 text-xs font-bold text-brand hover:bg-primary-muted"
                >
                  Lihat Detail
                </button>
              )}
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
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              {onViewDetail && (
                <button
                  type="button"
                  onClick={onViewDetail}
                  className="mr-auto rounded-full px-3 py-2 text-xs font-bold text-brand hover:bg-primary-muted"
                >
                  Lihat Detail
                </button>
              )}
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
