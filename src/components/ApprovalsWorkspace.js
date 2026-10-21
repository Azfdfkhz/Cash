"use client";

import { useEffect, useRef, useState } from "react";
import { PendingLink, usePendingNav } from "@/components/PendingNav";
import { DetailPanelSkeleton } from "@/components/skeletons/ListSkeletons";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Eye, Search, X } from "lucide-react";
import CashAdvanceCard from "@/components/CashAdvanceCard";
import NextAction from "@/components/NextAction";
import CompactIdr from "@/components/CompactIdr";
import ApprovalActions from "@/components/ApprovalActions";
import CashAdvanceReviewModal, { DecisionDialog } from "@/components/CashAdvanceReviewModal";
import CashAdvanceDetailPopup from "@/components/CashAdvanceDetailPopup";
import { useApprovalBadge } from "@/components/useApprovalBadge";
import ActionToast from "@/components/ActionToast";
import { useModalState } from "@/lib/useModalState";
import { MODAL } from "@/lib/modalState";
import { toJpegFile } from "@/lib/imageConvert";
import KindFilter, { KindFilterContent, KindFilterProvider } from "@/components/KindFilter";
import {
  formatCaCode,
  formatDateTimeShort,
  requesterName,
} from "@/lib/utils";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";

// Persetujuan & Pencairan: pengajuan baru masuk antrean, atau pengajuan lain
// berubah status (mis. diputuskan operasional lain) harus langsung terlihat.
const REALTIME_TABLES = ["cash_advances", "cash_advance_returns"];

// Label dibuat pendek supaya tidak terpotong di kolom daftar (22rem); nama
// lengkap ada di title/aria-label. Persetujuan dan pencairan adalah dua tahap
// operasional yang berbeda, jadi diberi penjelasan singkat (tanpa nomor tahap).
const TABS = [
  {
    id: "persetujuan",
    label: "Persetujuan",
    full: "Menunggu Persetujuan",
    hint: "Tinjau pengajuan, lalu setujui atau tolak.",
  },
  {
    id: "pencairan",
    label: "Pencairan",
    full: "Menunggu Pencairan",
    hint: "Transfer dana ke rekening requester, lalu unggah bukti transfer.",
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
  const base = new URLSearchParams();
  if (props.tab === "pencairan") base.set("tab", "pencairan");
  if (props.query) base.set("q", props.query);
  const baseQs = base.toString();
  return (
    <KindFilterProvider
      basePath={baseQs ? `/approvals?${baseQs}` : "/approvals"}
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
  query = "",
  focusId = null,
  pagination,
  currentUserId,
}) {
  const router = useRouter();
  // Auto-refresh antrean persetujuan/pencairan tanpa reload manual.
  useRealtimeRefresh(REALTIME_TABLES);
  const badge = useApprovalBadge(null, currentUserId, true);
  const { pending: navPending, navigate } = usePendingNav();
  const [searchText, setSearchText] = useState(query);
  const lastPushedQuery = useRef(query);
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
  // Pop up lanjutan setelah menyetujui/menolak lewat panel desktop. Satu modal
  // aktif pada satu waktu: "decision" { ca, step: "disburse" | "continue" } atau
  // "detail" { ca } -- membuka salah satunya menutup yang lain.
  const modals = useModalState();
  const decision = modals.isOpen(MODAL.DECISION) ? modals.active : null;
  const detailModal = modals.isOpen(MODAL.DETAIL) ? modals.active : null;
  const [notice, setNotice] = useState(null);
  // Bukti transfer yang dipilih langsung setelah menekan "Cairkan Sekarang".
  // Input file-nya selalu terpasang di sini (bukan di pop up yang segera
  // tertutup) supaya pemilih file tetap bisa mengirim hasilnya.
  const proofInputRef = useRef(null);
  const proofForRef = useRef(null);
  const [proof, setProof] = useState(null); // { caId, file }

  function tabHref(id) {
    const q = new URLSearchParams();
    if (id !== "persetujuan") q.set("tab", id);
    if (kind) q.set("jenis", kind);
    if (query) q.set("q", query);
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

  // Pencarian ditunda sebentar supaya tidak meminta ke database di tiap
  // ketikan. Mengganti kata kunci kembali ke halaman 1.
  function pushSearch(value) {
    const q = new URLSearchParams();
    if (isDisburseTab) q.set("tab", "pencairan");
    if (kind) q.set("jenis", kind);
    if (value) q.set("q", value);
    const str = q.toString();
    navigate?.(str ? `/approvals?${str}` : "/approvals", { replace: true, scroll: false });
  }

  useEffect(() => {
    const trimmed = searchText.trim();
    if (trimmed === lastPushedQuery.current) return undefined;
    const t = setTimeout(() => {
      lastPushedQuery.current = trimmed;
      pushSearch(trimmed);
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

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
      modals.open(MODAL.DECISION, { ca: decidedCa, step: "disburse" });
    } else if (hasOthers) {
      modals.open(MODAL.DECISION, { ca: decidedCa, step: "continue" });
    } else {
      setNotice({ type: "success", text: "Pengajuan ditolak." });
    }
    // Setelah daftar di-refresh, panel pindah ke pengajuan di posisi yang sama.
    const next = items[index + 1] ?? items[index - 1];
    if (next) setSelectedId(next.id);
  }

  // Escape menutup modal aktif (dialog keputusan = pilihan paling aman, bukan "cairkan").
  const activeName = modals.active?.name ?? null;
  const decisionStep = modals.active?.step ?? null;
  useEffect(() => {
    if (!activeName) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      if (activeName === MODAL.DECISION && decisionStep === "disburse") {
        const hasOthersLeft = items.some((ca) => ca.id !== modals.active.ca.id);
        if (hasOthersLeft) modals.open(MODAL.DECISION, { ca: modals.active.ca, step: "continue" });
        else modals.close();
      } else {
        modals.close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeName, decisionStep, items]);

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

        <div data-tour="approval-search" className="relative">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Cari username, nomor pengajuan, keperluan..."
            aria-label="Cari pengajuan"
            enterKeyHint="search"
            className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 text-base text-slate-900 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 lg:h-10 lg:text-sm [&::-webkit-search-cancel-button]:hidden"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => setSearchText("")}
              aria-label="Hapus pencarian"
              className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div data-tour="approval-tabs" role="tablist" aria-label="Daftar pengajuan" className="flex border-b border-slate-200">
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
                className={`-mb-px flex min-h-11 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "border-brand text-brand"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <span className="truncate">{t.label}</span>
                <span
                  className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
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

        {/* Desktop: Cash Advance / Reimbursement ada di sub-menu Persetujuan (sidebar). */}
        <div className="lg:hidden">
          <KindFilter
            counts={kindCounts}
            dots={{
              cash_advance: badge.cash_advance > 0,
              reimbursement: badge.reimbursement > 0,
            }}
          />
        </div>

        <KindFilterContent skeletons={4}>
        {items.length === 0 && (
          <p className="text-sm text-slate-500">
            {query
              ? `Tidak ada pengajuan yang cocok dengan "${query}".`
              : isDisburseTab
                ? "Tidak ada pengajuan yang menunggu pencairan."
                : "Tidak ada pengajuan yang menunggu persetujuan."}
          </p>
        )}

        <div data-tour="approval-list" className="space-y-3 lg:hidden">
          {items.map((ca) => (
            <CashAdvanceCard
              key={ca.id}
              ca={ca}
              showRequester
              compact
              detailLabel="Lihat Detail"
              onClick={() => openReview(ca.id)}
            />
          ))}
        </div>

        <div data-tour="approval-list" className="hidden space-y-3 lg:block">
          {items.map((ca) => {
            const active = ca.id === selected?.id;
            return (
              <div
                key={ca.id}
                className={`w-full rounded-2xl border bg-white p-4 text-left transition-colors ${
                  active
                    ? "border-brand ring-2 ring-primary-ring"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="truncate text-sm font-semibold text-slate-900">
                  {requesterName(ca.profiles)}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">{ca.purpose}</p>
                <p className="mt-1.5 text-base font-bold text-slate-900">
                  <CompactIdr value={ca.amount_requested} />
                </p>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-500">
                    {formatDateTimeShort(ca.created_at)}
                    <span className="font-num"> · {formatCaCode(ca)}</span>
                  </span>
                  <NextAction ca={ca} operational className="text-right" />
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(ca.id)}
                  aria-pressed={active}
                  className={`mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors ${
                    active
                      ? "border-brand bg-brand text-white"
                      : "border-brand bg-primary-muted text-brand hover:bg-brand hover:text-white"
                  }`}
                >
                  <Eye size={15} aria-hidden="true" />
                  {active ? "Sedang Dilihat" : "Lihat Detail"}
                </button>
              </div>
            );
          })}
        </div>

        {pagination}
        </KindFilterContent>
      </section>

      <aside data-tour="approval-detail" className="hidden lg:block lg:sticky lg:top-8">
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
                proofFile={proof && proof.caId === selected.id ? proof.file : null}
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
              <div data-tour="approval-actions" className="shrink-0 border-t border-slate-200 pb-1">
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
          if (raw && proofForRef.current) {
            setProof({ caId: proofForRef.current, file: await toJpegFile(raw) });
          }
        }}
      />

      {decision?.step && (
        <DecisionDialog
          standalone
          result={{ status: decision.ca.status, step: decision.step }}
          ca={decision.ca}
          isReimbursement={decision.ca.kind === "reimbursement"}
          nextPendingCount={othersPending.length}
          onLater={() =>
            othersPending.length > 0
              ? modals.open(MODAL.DECISION, { ca: decision.ca, step: "continue" })
              : modals.close()
          }
          // Pindah ke tab Menunggu Pencairan dengan pengajuan ini terpilih --
          // formulir pencairan ada di panel, bukan pop up.
          onDisburseNow={() => {
            // Harus dipanggil langsung dari klik user, kalau tidak diblokir browser.
            proofForRef.current = decision.ca.id;
            proofInputRef.current?.click();
            const q = new URLSearchParams({ tab: "pencairan", ca: decision.ca.id });
            if (kind) q.set("jenis", kind);
            modals.close();
            router.push(`/approvals?${q}`, { scroll: false });
          }}
          onStay={() => modals.close()}
          onGoNext={() => {
            const next = othersPending[0];
            if (next) setSelectedId(next.id);
            modals.close();
          }}
          // Dialog persetujuan ditutup, hanya modal Detail yang tampil.
          onViewDetail={() => modals.open(MODAL.DETAIL, { ca: decision.ca })}
        />
      )}

      {detailModal && (
        <CashAdvanceDetailPopup
          standalone
          ca={detailModal.ca}
          onClose={() => modals.close(MODAL.DETAIL)}
          currentUserId={currentUserId}
          isOperational
        />
      )}

      <ActionToast notice={notice} onDismiss={() => setNotice(null)} />

    </div>
  );
}
