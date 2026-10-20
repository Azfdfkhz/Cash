"use client";

import { useState } from "react";
import { PendingLink, usePendingNav } from "@/components/PendingNav";
import { DetailPanelSkeleton } from "@/components/skeletons/ListSkeletons";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import CashAdvanceCard from "@/components/CashAdvanceCard";
import NextAction from "@/components/NextAction";
import ApprovalActions from "@/components/ApprovalActions";
import CashAdvanceReviewModal, { DecisionDialog } from "@/components/CashAdvanceReviewModal";
import CashAdvanceDetailPopup from "@/components/CashAdvanceDetailPopup";
import KindFilter, { KindFilterContent, KindFilterProvider } from "@/components/KindFilter";
import {
  formatCompactIdr,
  formatDateTimeShort,
  KIND_LABEL,
} from "@/lib/utils";

// Label dibuat pendek supaya tidak terpotong di kolom daftar (22rem); nama
// lengkap ada di title/aria-label. Persetujuan dan pencairan adalah dua tahap
// operasional yang berbeda, jadi diberi nomor tahap + penjelasan singkat.
const TABS = [
  {
    id: "persetujuan",
    step: 1,
    label: "Persetujuan",
    full: "Menunggu Persetujuan",
    hint: "Tahap 1 · Tinjau pengajuan, lalu setujui atau tolak.",
  },
  {
    id: "pencairan",
    step: 2,
    label: "Pencairan",
    full: "Menunggu Pencairan",
    hint: "Tahap 2 · Transfer dana ke rekening requester, lalu unggah bukti transfer.",
  },
];

// Dua tab -- Menunggu Persetujuan & Menunggu Pencairan -- dengan cara kerja yang
// sama, jadi operasional tidak perlu menggulir melewati satu daftar untuk
// sampai ke daftar lainnya. Hanya daftar pada tab aktif yang dimuat dari
// database (`items`); angka di kedua tab (`counts`) dihitung terpisah.
// Mobile: daftar kartu; kartu membuka panel tinjau yang sama untuk kedua tab
// (menyetujui/menolak, atau form pencairan langsung di dalamnya).
// Desktop (≥lg): daftar di kiri + panel detail & aksi di kanan.
// Semua dibuka langsung di halaman ini -- tidak pindah ke Beranda.
export default function ApprovalsWorkspace(props) {
  return (
    <KindFilterProvider
      basePath={props.tab === "pencairan" ? "/approvals?tab=pencairan" : "/approvals"}
      active={props.kind ?? null}
    >
      <ApprovalsWorkspaceInner {...props} />
    </KindFilterProvider>
  );
}

function ApprovalsWorkspaceInner({
  items,
  tab = "persetujuan",
  counts = { persetujuan: 0, pencairan: 0 },
  kind = null,
  kindCounts = null,
  focusId = null,
  pagination,
  currentUserId,
}) {
  const router = useRouter();
  const { pending: navPending } = usePendingNav();
  const isDisburseTab = tab === "pencairan";
  const count = counts[tab] ?? 0;
  const [selectedId, setSelectedId] = useState(focusId ?? items[0]?.id ?? null);
  // Datang dari "Cairkan Sekarang" (?ca=): pilih pengajuan itu di daftar.
  const [seenFocus, setSeenFocus] = useState(focusId);
  if (seenFocus !== focusId) {
    setSeenFocus(focusId);
    if (focusId) setSelectedId(focusId);
  }

  // Pop up tinjau pengajuan (mobile). `held` = salinan pengajuan yang baru
  // diputuskan/dicairkan, supaya modal tetap menampilkan hasilnya walau daftar
  // sudah di-refresh dan pengajuan itu hilang dari daftar.
  const [reviewId, setReviewId] = useState(null);
  const [held, setHeld] = useState(null);
  // Pop up lanjutan setelah menyetujui/menolak lewat panel desktop:
  // { ca, step: "disburse" | "continue" } -- sama dengan yang ada di pop up tinjau.
  const [decision, setDecision] = useState(null);

  function tabHref(id) {
    const q = new URLSearchParams();
    if (id !== "persetujuan") q.set("tab", id);
    if (kind) q.set("jenis", kind);
    const str = q.toString();
    return str ? `/approvals?${str}` : "/approvals";
  }

  const reviewIndex = items.findIndex((i) => i.id === reviewId);
  const liveReview = reviewIndex >= 0 ? items[reviewIndex] : null;
  const heldHere = held && held.id === reviewId ? held : null;
  const heldOnly = !!heldHere && reviewIndex < 0;
  const reviewCa =
    liveReview && liveReview.status !== "pending" && !isDisburseTab
      ? liveReview
      : heldHere ?? liveReview;
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

  // Dana sudah dicairkan dari panel tinjau (mobile): tahan salinannya supaya
  // panel tetap menampilkan hasil sampai daftar selesai di-refresh.
  function handleDisbursed(caId) {
    const src = items.find((i) => i.id === caId) ?? reviewCa;
    if (src) {
      setHeld({
        ...src,
        disbursed_at: new Date().toISOString(),
        index: Math.max(0, items.findIndex((i) => i.id === caId)),
      });
    }
  }

  function handleGoNextPending() {
    const afterIndex = heldOnly ? held.index - 1 : reviewIndex;
    const next =
      pendingOthers.find((ca) => items.indexOf(ca) > afterIndex) ?? pendingOthers[0];
    if (next) openReview(next.id);
  }

  const othersPending = decision
    ? items.filter((ca) => ca.id !== decision.ca.id)
    : [];

  // Dipanggil ApprovalActions (panel desktop) setelah keputusan tersimpan.
  function handlePanelDecided(status, note) {
    if (!selected) return;
    const decidedCa = {
      ...selected,
      status,
      review_note: note ?? selected.review_note ?? null,
      reviewed_at: new Date().toISOString(),
    };
    const hasOthers = items.some((ca) => ca.id !== selected.id);
    if (status === "approved") {
      setDecision({ ca: decidedCa, step: "disburse" });
    } else if (hasOthers) {
      setDecision({ ca: decidedCa, step: "continue" });
    }
    // Setelah daftar di-refresh, panel pindah ke pengajuan di posisi yang sama.
    const next = items[index + 1] ?? items[index - 1];
    if (next) setSelectedId(next.id);
  }

  const index = Math.max(0, items.findIndex((i) => i.id === selectedId));
  const selected = items[index] ?? null;

  function move(delta) {
    const next = items[index + delta];
    if (next) setSelectedId(next.id);
  }


  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
      <section className="space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900 lg:text-xl lg:font-bold">
              Persetujuan
            </h1>
          </div>
          <p className="mt-0.5 text-sm text-slate-500 lg:text-xs">
            {isDisburseTab
              ? `${count} pengajuan menunggu pencairan dana.`
              : `${count} pengajuan menunggu persetujuan Anda.`}
          </p>
        </div>

        <div role="tablist" aria-label="Daftar pengajuan" className="flex border-b border-slate-200">
          {TABS.map((t) => {
            const active = t.id === tab;
            const n = counts[t.id] ?? 0;
            return (
              <PendingLink
                key={t.id}
                href={tabHref(t.id)}
                scroll={false}
                role="tab"
                aria-selected={active}
                title={t.full}
                aria-label={`${t.full}, ${n} pengajuan`}
                className={`-mb-px flex flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2.5 text-[13px] font-semibold transition-colors ${
                  active
                    ? "border-brand text-brand"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                    active ? "bg-brand text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {t.step}
                </span>
                <span className="truncate">{t.label}</span>
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                    active
                      ? "bg-brand/10 text-brand"
                      : n > 0
                        ? "bg-orange-50 text-orange-600"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {n}
                </span>
              </PendingLink>
            );
          })}
        </div>

        <p className="text-xs text-slate-500">{TABS.find((t) => t.id === tab)?.hint}</p>

        <div>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Jenis pengajuan
          </p>
          <KindFilter counts={kindCounts} />
        </div>

        <KindFilterContent skeletons={4}>
        {items.length === 0 && (
          <p className="text-sm text-slate-500">
            {isDisburseTab
              ? "Tidak ada pengajuan yang menunggu pencairan."
              : "Tidak ada pengajuan yang menunggu persetujuan."}
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
                <p className="mt-0.5 truncate text-xs text-slate-500">{ca.purpose}</p>
                <p className="mt-1.5 text-base font-bold text-slate-900">
                  {formatCompactIdr(ca.amount_requested)}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-500">
                    {formatDateTimeShort(ca.created_at)}
                  </span>
                  <NextAction ca={ca} operational className="text-right" />
                </div>
              </button>
            );
          })}
        </div>

        {pagination}
        </KindFilterContent>
      </section>

      <aside className="hidden lg:block lg:sticky lg:top-8">
        {navPending ? (
          <DetailPanelSkeleton />
        ) : selected ? (
          <div className="flex h-[calc(100vh-4.5rem)] min-h-[32rem] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white">
            <div className="min-h-0 flex-1">
              <CashAdvanceDetailPopup
                key={selected.id}
                ca={selected}
                onClose={() => {}}
                currentUserId={currentUserId}
                isOperational
                inline
                initialFocus={isDisburseTab ? "pencairan" : null}
                headerActions={
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
                }
              />
            </div>

            {selected.status === "pending" && selected.requester_id !== currentUserId && (
              <div className="shrink-0 border-t border-slate-200 pb-1">
                <ApprovalActions
                  key={selected.id}
                  cashAdvanceId={selected.id}
                  variant="panel"
                  onDecided={handlePanelDecided}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            {isDisburseTab
              ? "Tidak ada pengajuan untuk dicairkan."
              : "Tidak ada pengajuan untuk ditinjau."}
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
        onDisbursed={handleDisbursed}
      />

      {decision?.step && (
        <DecisionDialog
          standalone
          result={{ status: decision.ca.status, step: decision.step }}
          ca={decision.ca}
          isReimbursement={decision.ca.kind === "reimbursement"}
          nextPendingCount={othersPending.length}
          onLater={() =>
            setDecision(
              othersPending.length > 0 ? { ca: decision.ca, step: "continue" } : null
            )
          }
          // Pindah ke tab Menunggu Pencairan dengan pengajuan ini terpilih --
          // formulir pencairan ada di panel, bukan pop up.
          onDisburseNow={() => {
            const q = new URLSearchParams({ tab: "pencairan", ca: decision.ca.id });
            if (kind) q.set("jenis", kind);
            setDecision(null);
            router.push(`/approvals?${q}`, { scroll: false });
          }}
          onStay={() => setDecision(null)}
          onGoNext={() => {
            const next = othersPending[0];
            if (next) setSelectedId(next.id);
            setDecision(null);
          }}
        />
      )}

    </div>
  );
}
