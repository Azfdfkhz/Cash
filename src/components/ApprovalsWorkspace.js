"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import CashAdvanceCard from "@/components/CashAdvanceCard";
import StatusBadge from "@/components/StatusBadge";
import ApprovalActions from "@/components/ApprovalActions";
import CashAdvanceReviewModal from "@/components/CashAdvanceReviewModal";
import CashAdvanceDetailPopup from "@/components/CashAdvanceDetailPopup";
import KindFilter, { KindFilterContent, KindFilterProvider } from "@/components/KindFilter";
import {
  formatCompactIdr,
  formatCurrency,
  formatDate,
  formatDateTimeShort,
  FUNDING_SOURCE_LABEL,
  OBJECTIVE_LABEL,
  KIND_LABEL,
} from "@/lib/utils";

function Info({ label, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-0.5 text-sm font-semibold text-slate-900">{children}</div>
    </div>
  );
}

// Mobile: daftar kartu; kartu menunggu persetujuan membuka pop up tinjau,
// kartu menunggu pencairan membuka pop up detail (form pencairan).
// Desktop (≥lg): daftar di kiri + panel detail & aksi di kanan.
// Semua pop up dibuka langsung di halaman ini -- tidak pindah ke Beranda.
export default function ApprovalsWorkspace({
  items,
  toDisburse = [],
  kind = null,
  count,
  pagination,
  currentUserId,
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? null);

  // Pop up tinjau pengajuan (mobile). `held` = salinan pengajuan yang baru
  // diputuskan, supaya modal tetap menampilkan hasilnya walau daftar
  // "menunggu" sudah di-refresh dan pengajuan itu hilang dari daftar.
  const [reviewId, setReviewId] = useState(null);
  const [held, setHeld] = useState(null);
  // Pop up detail lengkap: { ca, focus } -- `ca` disimpan sebagai cadangan
  // kalau pengajuannya sudah keluar dari daftar (mis. setelah dicairkan).
  const [detail, setDetail] = useState(null);

  const reviewIndex = items.findIndex((i) => i.id === reviewId);
  const liveReview =
    reviewIndex >= 0 ? items[reviewIndex] : toDisburse.find((i) => i.id === reviewId) ?? null;
  const heldHere = held && held.id === reviewId ? held : null;
  const heldOnly = !!heldHere && reviewIndex < 0;
  const reviewCa =
    liveReview && liveReview.status !== "pending" ? liveReview : heldHere ?? liveReview;
  const inReviewList = heldOnly || reviewIndex >= 0;
  const prevReview = !inReviewList
    ? undefined
    : heldOnly
      ? items[held.index - 1]
      : items[reviewIndex - 1];
  const nextReview = !inReviewList
    ? undefined
    : heldOnly
      ? items[held.index]
      : items[reviewIndex + 1];
  const pendingOthers = items.filter((ca) => ca.id !== reviewId);

  function openReview(id) {
    setHeld(null);
    setReviewId(id);
  }

  function handleDecisionComplete(decidedId, status, note) {
    if (reviewCa) {
      setHeld({
        ...reviewCa,
        status,
        review_note: note ?? reviewCa.review_note ?? null,
        reviewed_at: new Date().toISOString(),
        index: Math.max(0, reviewIndex),
      });
    }
    router.refresh();
  }

  function handleGoNextPending() {
    const afterIndex = heldOnly ? held.index - 1 : reviewIndex;
    const next =
      pendingOthers.find((ca) => items.indexOf(ca) > afterIndex) ?? pendingOthers[0];
    if (next) openReview(next.id);
  }

  const detailLive = detail
    ? items.find((i) => i.id === detail.ca.id) ??
      toDisburse.find((i) => i.id === detail.ca.id) ??
      null
    : null;
  // Objek baru tiap data di-refresh supaya pop up memuat ulang isinya, juga
  // saat pengajuan sudah tidak ada di kedua daftar.
  const detailCa = useMemo(
    () => (detail ? detailLive ?? { ...detail.ca } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detail, detailLive, items, toDisburse]
  );

  const index = Math.max(0, items.findIndex((i) => i.id === selectedId));
  const selected = items[index] ?? null;

  function move(delta) {
    const next = items[index + delta];
    if (next) setSelectedId(next.id);
  }

  const isReimbursement = selected?.kind === "reimbursement";
  const holder = selected
    ? selected.bank_account_holder || selected.profiles?.bank_account_holder || selected.profiles?.full_name
    : "";

  return (
    <KindFilterProvider basePath="/approvals" active={kind}>
    <div className="space-y-4 lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
      <section className="space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900 lg:text-xl lg:font-bold">
              Persetujuan
            </h1>
            <span className="hidden lg:flex h-6 min-w-6 items-center justify-center rounded-full border border-orange-300 bg-orange-50 px-1.5 text-xs font-semibold text-orange-600">
              {count ?? 0}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500 lg:hidden">
            {count ?? 0} pengajuan menunggu persetujuan Anda.
          </p>
          <p className="mt-0.5 hidden text-xs text-slate-500 lg:block">
            Pilih pengajuan untuk meninjau rincian biaya.
          </p>
        </div>

        <KindFilter />

        <KindFilterContent skeletons={4}>
        {toDisburse.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">
              Menunggu Pencairan ({toDisburse.length})
            </h2>
            {toDisburse.map((ca) => (
              <CashAdvanceCard
                key={ca.id}
                ca={ca}
                showRequester
                onClick={() => setDetail({ ca, focus: "pencairan" })}
              />
            ))}
            <h2 className="pt-2 text-sm font-semibold text-slate-700">
              Menunggu Persetujuan
            </h2>
          </div>
        )}

        {items.length === 0 && (
          <p className="text-sm text-slate-500">
            Tidak ada pengajuan yang menunggu persetujuan.
          </p>
        )}

        <div className="space-y-3 lg:hidden">
          {items.map((ca) => (
            <CashAdvanceCard
              key={ca.id}
              ca={ca}
              showRequester
              onClick={() => openReview(ca.id)}
            />
          ))}
        </div>

        <div className="hidden space-y-3 lg:block">
          {items.map((ca) => {
            const active = ca.id === selected?.id;
            return (
              <button
                key={ca.id}
                type="button"
                onClick={() => setSelectedId(ca.id)}
                aria-pressed={active}
                className={`w-full rounded-2xl border bg-white p-4 text-left transition-colors ${
                  active
                    ? "border-brand ring-2 ring-primary-ring"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {ca.profiles?.full_name}
                  </p>
                  {active && (
                    <span className="rounded-md bg-primary-muted px-2 py-0.5 text-[11px] font-semibold text-brand">
                      Dipilih
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-brand">
                  {KIND_LABEL[ca.kind] ?? "Cash Advance"}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {ca.purpose} · {formatCompactIdr(ca.amount_requested).replace("Rp ", "")}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[11px] text-slate-400">
                    {formatDateTimeShort(ca.created_at)}
                  </span>
                  <StatusBadge status={ca.status} />
                </div>
              </button>
            );
          })}
        </div>

        {pagination}
        </KindFilterContent>
      </section>

      <aside className="hidden lg:block lg:sticky lg:top-8">
        {selected ? (
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-brand">
                    {KIND_LABEL[selected.kind] ?? "Cash Advance"}
                  </span>
                </div>
                <h2 className="mt-2 truncate text-xl font-bold text-slate-900">
                  {selected.purpose}
                </h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => move(-1)}
                  disabled={index === 0}
                  aria-label="Pengajuan sebelumnya"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronUp size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => move(1)}
                  disabled={index >= items.length - 1}
                  aria-label="Pengajuan berikutnya"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-5 px-6 pt-5">
              <div className="rounded-2xl border border-slate-200 p-5">
                <p className="text-xs text-slate-500">{isReimbursement ? "Nominal diajukan" : "Plafon diajukan"}</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  {formatCurrency(selected.amount_requested)}
                </p>
                {selected.funding_source && (
                  <p className="mt-1 text-xs text-slate-500">
                    Kategori:{" "}
                    {FUNDING_SOURCE_LABEL[selected.funding_source] ??
                      selected.funding_source}
                    {selected.program_ref ? ` · ${selected.program_ref}` : ""}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Info label="Nama Pemohon">{selected.profiles?.full_name ?? "-"}</Info>
                <Info label={isReimbursement ? "Rekening Penggantian" : "Rekening Pencairan"}>
                  {selected.bank_name || selected.bank_account_number ? (
                    <>
                      {[selected.bank_name, selected.bank_account_number]
                        .filter(Boolean)
                        .join(" ")}
                      <span className="block text-xs font-normal text-slate-500">
                        a.n {holder}
                      </span>
                    </>
                  ) : (
                    "-"
                  )}
                </Info>
                {selected.objective && (
                  <Info label="Tujuan">
                    {OBJECTIVE_LABEL[selected.objective] ?? selected.objective}
                  </Info>
                )}
                {selected.fund_usage_date && (
                  <Info label="Tanggal Dana Mulai Digunakan">
                    {formatDate(selected.fund_usage_date)}
                  </Info>
                )}
              </div>

              {!isReimbursement && selected.rab_url && (
                <a
                  href={selected.rab_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 hover:border-brand"
                >
                  <span>
                    <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Lampiran RAB & nota estimasi
                    </span>
                    <span className="mt-0.5 block text-sm font-semibold text-slate-900">
                      Buka RAB
                    </span>
                  </span>
                  <ExternalLink size={16} className="text-slate-500" />
                </a>
              )}

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Diajukan pada {formatDateTimeShort(selected.created_at)}</span>
                <button
                  type="button"
                  onClick={() => setDetail({ ca: selected, focus: null })}
                  className="font-semibold text-brand hover:underline"
                >
                  Lihat detail lengkap
                </button>
              </div>
            </div>

            <ApprovalActions
              key={selected.id}
              cashAdvanceId={selected.id}
              variant="panel"
            />
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            Tidak ada pengajuan untuk ditinjau.
          </div>
        )}
      </aside>

      <CashAdvanceReviewModal
        isOpen={!!reviewCa}
        onClose={() => {
          setReviewId(null);
          setHeld(null);
        }}
        ca={reviewCa}
        onPrev={() => prevReview && openReview(prevReview.id)}
        onNext={() => nextReview && openReview(nextReview.id)}
        hasPrev={!!prevReview}
        hasNext={!!nextReview}
        currentUserId={currentUserId}
        canReview
        onDecisionComplete={handleDecisionComplete}
        nextPendingCount={pendingOthers.length}
        onGoNext={handleGoNextPending}
      />

      {detailCa && (
        <CashAdvanceDetailPopup
          ca={detailCa}
          onClose={() => setDetail(null)}
          currentUserId={currentUserId}
          isOperational
          initialFocus={detail.focus}
          standalone
        />
      )}
    </div>
    </KindFilterProvider>
  );
}
