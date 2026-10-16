"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Check,
  ChevronUp,
  ChevronDown,
  Calendar,
  ExternalLink,
  Clock,
  FileSpreadsheet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  formatCurrency,
  formatDateTimeFull,
  formatCaCode,
  formatLpjDeadline,
  FUNDING_SOURCE_LABEL,
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
  onDecisionComplete,
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const overlayRef = useRef(null);

  const isOwner = ca.requester_id === currentUserId;

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
      onDecisionComplete(ca.id, status);
    } else {
      router.refresh();
      onClose();
    }
  }

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) {
      onClose();
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-6 backdrop-blur-[2px]"
      aria-modal="true"
      role="dialog"
    >
      <div className="animate-scale-up relative flex max-h-[92vh] w-full max-w-[680px] flex-col rounded-[28px] sm:rounded-[36px] bg-white shadow-2xl border border-slate-200/80 overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 sm:px-8 py-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-[#eff6ff] px-2.5 py-1 text-xs font-bold text-[#2563eb]">
                {formatCaCode(ca)}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fde8c3] bg-[#fff9ed] px-3 py-0.5 text-xs font-semibold text-[#b45309]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
                Menunggu Verifikasi
              </span>
            </div>
            <h2 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {ca.purpose}
            </h2>
          </div>

          {/* Controls: Up, Down, Close */}
          <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={onPrev}
              disabled={!hasPrev || loading}
              aria-label="Pengajuan sebelumnya"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronUp size={18} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!hasNext || loading}
              aria-label="Pengajuan berikutnya"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronDown size={18} strokeWidth={2} />
            </button>
            <div className="mx-1 h-5 w-px bg-slate-200" />
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              aria-label="Tutup"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 sm:px-8 py-6 space-y-6">
          {/* Card: Plafon Diajukan */}
          <div className="rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.03)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  PLAFON DIAJUKAN
                </p>
                <p className="mt-1 text-3xl sm:text-[34px] font-black tracking-tight text-slate-900">
                  {formatCurrency(ca.amount_requested)}
                </p>
                <p className="mt-1 text-xs text-slate-500 font-medium">
                  Kategori: {categoryFull}
                </p>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-center rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#2563eb]">
                  <Calendar size={18} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    TENGGAT LPJ / SPJ
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">
                    {formatLpjDeadline(ca)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Grid 2 Cols: Nama Pemohon & Rekening Pencairan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5">
              <p className="text-xs font-medium text-slate-400">Nama Pemohon</p>
              <p className="mt-1 text-base font-bold text-slate-900">
                {ca.profiles?.full_name || "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5">
              <p className="text-xs font-medium text-slate-400">Rekening Pencairan</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <p className="text-base font-bold text-slate-900">
                  {[ca.bank_name, ca.bank_account_number].filter(Boolean).join(" ") || "-"}
                </p>
                {(ca.bank_name || ca.bank_account_number) && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-[#ebf9f0] px-2 py-0.5 text-[11px] font-semibold text-[#1fa653] shrink-0">
                    <Check size={12} strokeWidth={3} />
                    Terverifikasi
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                a.n {ca.profiles?.full_name || "-"}
              </p>
            </div>
          </div>

          {/* Rincian Keperluan Pengajuan */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
              RINCIAN KEPERLUAN PENGAJUAN
            </p>
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 p-4 sm:p-5 text-[13.5px] leading-relaxed text-slate-700">
              {ca.purpose}
            </div>
          </div>

          {/* Lampiran RAB & Nota Estimasi */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2">
              LAMPIRAN RAB & NOTA ESTIMASI
            </p>
            {ca.rab_url ? (
              <a
                href={ca.rab_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 hover:border-slate-300 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-[#eafaf1] text-[#12a150]">
                    <FileSpreadsheet size={22} strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Link Spreadsheet</p>
                    <p className="text-xs text-slate-400 mt-0.5">Spreadsheet Google Sheets</p>
                  </div>
                </div>
                <div className="rounded-lg p-2 text-slate-400 group-hover:text-slate-600 transition-colors">
                  <ExternalLink size={18} strokeWidth={2} />
                </div>
              </a>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs text-slate-400">
                Tidak ada lampiran RAB
              </div>
            )}
          </div>

          {/* Catatan (Wajib Diisi Jika Menolak) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="review-note-input"
                className="text-[11px] font-bold uppercase tracking-wider text-slate-700"
              >
                CATATAN{" "}
                <span className="font-semibold text-rose-500">
                  (WAJIB DIISI JIKA MENOLAK)
                </span>
              </label>
              <span className="text-xs text-slate-400">Opsional untuk persetujuan</span>
            </div>
            <textarea
              id="review-note-input"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                if (error) setError("");
              }}
              rows={3}
              placeholder="Tulis catatan verifikasi atau alasan spesifik jika pengajuan ini ditolak..."
              className="w-full rounded-2xl border border-slate-200/90 bg-white p-4 text-sm placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
            />
            {error && (
              <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>
            )}
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock size={15} strokeWidth={1.75} />
            <span>Diajukan pada {formatDateTimeFull(ca.created_at)}</span>
          </div>
        </div>

        {/* ── Action Buttons Footer ── */}
        <div className="border-t border-slate-100 bg-white px-6 sm:px-8 py-4 sm:py-5">
          {isOwner ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-center text-xs font-semibold text-amber-800">
              Menunggu persetujuan admin lain. Anda tidak bisa menyetujui pengajuan sendiri.
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => handleDecide("rejected")}
                disabled={loading}
                className="flex min-w-[130px] items-center justify-center gap-2 rounded-full border border-rose-400 bg-white px-8 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 active:bg-rose-100 disabled:opacity-50 transition-colors shadow-sm"
              >
                <X size={18} strokeWidth={2.5} />
                Tolak
              </button>
              <button
                type="button"
                onClick={() => handleDecide("approved")}
                disabled={loading}
                className="flex min-w-[180px] items-center justify-center gap-2 rounded-full bg-[#0f172a] px-8 py-3 text-sm font-bold text-white hover:bg-slate-800 active:bg-slate-900 disabled:opacity-50 transition-colors shadow-sm"
              >
                <Check size={18} strokeWidth={2.5} />
                Setujui Pengajuan
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
