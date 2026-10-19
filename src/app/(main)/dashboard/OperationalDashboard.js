"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, CreditCard, TrendingUp, TriangleAlert } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import Pagination from "@/components/Pagination";
import KindFilter, { KindFilterContent, KindFilterProvider } from "@/components/KindFilter";
import CashAdvanceReviewModal from "@/components/CashAdvanceReviewModal";
import { PAGE_SIZE } from "@/lib/pagination";
import {
  formatCurrency,
  formatCompactIdr,
  formatDateLong,
  formatDateTimeShort,
  formatNumber,
  KIND_LABEL,
} from "@/lib/utils";
import { RoleBadge, StatCard, FilterTabs, TH } from "./parts";

// Teks & gaya tombol aksi menurut status (dipakai kartu mobile)
const MOBILE_ACTION = {
  pending: { label: "Tinjau Pengajuan", primary: true },
  approved: { label: "Lihat Bukti Transfer & Detail SPJ" },
  rejected: { label: "Lihat Catatan" },
  closed: { label: "Lihat Detail" },
};

function KindTag({ kind }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wide text-brand">
      {KIND_LABEL[kind] ?? "Cash Advance"}
    </p>
  );
}

// Disetujui tapi dana belum dicairkan/ditransfer = tugas tim operasional.
function pendingTransferLabel(ca) {
  if (ca.status !== "approved" || ca.disbursed_at) return null;
  return ca.kind === "reimbursement" ? "Belum ditransfer" : "Belum dicairkan";
}

function Metric({ value, label, divider }) {
  return (
    <div className={`flex-1 ${divider ? "border-l border-slate-100 pl-4" : ""}`}>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-medium leading-snug text-slate-500">{label}</p>
    </div>
  );
}

function QuickTile({ href, icon: Icon, tone, title, caption }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-[0_2px_6px_-2px_rgba(0,0,0,0.03)] transition-colors hover:border-slate-300"
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold leading-tight text-slate-900">{title}</span>
        <span className="mt-0.5 block text-[10px] leading-tight text-slate-500">{caption}</span>
      </span>
    </Link>
  );
}

export default function OperationalDashboard({
  name,
  stats,
  list,
  count,
  page,
  filter,
  kind,
  currentUserId,
  focusCa = null,
}) {
  const router = useRouter();
  const basePath = filter === "pending" ? "/dashboard?filter=pending" : "/dashboard";
  const filterParams = { jenis: kind };

  // State untuk pop up review pengajuan
  const [reviewCaId, setReviewCaId] = useState(focusCa?.id ?? null);
  // Dibuka dari tautan (?ca=): langsung tampilkan pop up detail.
  const [autoDetailId, setAutoDetailId] = useState(focusCa?.id ?? null);
  // Salinan pengajuan yang baru diputuskan. Dipakai supaya modal tetap terbuka
  // di pengajuan itu (menampilkan hasilnya) walau daftar "menunggu" sudah
  // di-refresh dan pengajuan tsb hilang dari daftar.
  const [held, setHeld] = useState(null);

  const listIndex = list.findIndex((ca) => ca.id === reviewCaId);
  const heldHere = held && held.id === reviewCaId ? held : null;
  const heldOnly = !!heldHere && listIndex < 0; // sudah hilang dari daftar
  // Data segar dari server dipakai begitu statusnya sudah bukan "menunggu"
  // (mis. setelah dicairkan); sebelum itu pakai salinan hasil keputusan.
  const listCa =
    listIndex >= 0 ? list[listIndex] : focusCa && focusCa.id === reviewCaId ? focusCa : null;
  const reviewCa =
    listCa && listCa.status !== "pending" ? listCa : heldHere ?? listCa;

  // Posisi acuan untuk prev/next. Kalau pengajuan sudah hilang dari daftar,
  // pakai posisi saat diputuskan (item berikutnya bergeser ke posisi itu).
  const inList = heldOnly || listIndex >= 0;
  const prevCa = !inList ? undefined : heldOnly ? list[held.index - 1] : list[listIndex - 1];
  const nextCa = !inList ? undefined : heldOnly ? list[held.index] : list[listIndex + 1];

  const pendingOthers = list.filter(
    (ca) => ca.status === "pending" && ca.id !== reviewCaId
  );

  function openReview(id) {
    setHeld(null);
    setAutoDetailId(null);
    setReviewCaId(id);
  }

  function handlePrevReview() {
    if (prevCa) openReview(prevCa.id);
  }

  function handleNextReview() {
    if (nextCa) openReview(nextCa.id);
  }

  // Setelah setuju/tolak: TIDAK pindah otomatis. Modal tetap di pengajuan ini;
  // pindah hanya kalau user memilih "Lanjut" di pop up (handleGoNextPending).
  function handleDecisionComplete(decidedId, status, note) {
    if (reviewCa) {
      setHeld({
        ...reviewCa,
        status,
        review_note: note ?? reviewCa.review_note ?? null,
        reviewed_at: new Date().toISOString(),
        index: Math.max(0, listIndex),
      });
    }
    router.refresh();
  }

  function handleGoNextPending() {
    const afterIndex = heldOnly ? held.index - 1 : listIndex;
    const next =
      pendingOthers.find((ca) => list.indexOf(ca) > afterIndex) ?? pendingOthers[0];
    if (next) openReview(next.id);
  }

  return (
    <KindFilterProvider basePath={basePath} active={kind}>
    <div>
      {/* ───────── Mobile ───────── */}
      <div className="lg:hidden space-y-5">
        <div className="flex items-end justify-between pt-2">
          <div>
            <p className="text-sm font-medium text-slate-500">Selamat Datang</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{name}</h1>
          </div>
          <div className="pb-1">
            <RoleBadge dot dark>Operasional</RoleBadge>
          </div>
        </div>

        <section className="rounded-[28px] border border-slate-200/90 bg-white px-6 pb-6 pt-6 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)]">
          <p className="text-[13px] font-medium text-slate-500">Total Saldo Berjalan</p>
          <p className="pb-4 pt-1.5 text-[32px] font-extrabold leading-8 tracking-tight text-[#0d1b2a]">
            {formatCurrency(stats.totalOutstanding)}
          </p>
          <div className="flex gap-4 border-t border-slate-100 pt-4">
            <Metric value={stats.pendingCount} label="Perlu Disetujui" />
            <Metric value={stats.activeCount} label="CA Berjalan" divider />
            <Metric value={stats.needsSpjCount} label="Perlu SPJ/Laporan" divider />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <QuickTile
            href="/approvals"
            icon={Clock}
            tone="bg-[#fff4dc] text-[#d98a0b]"
            title="Approval Antrean"
            caption={`${stats.pendingCount} pengajuan menunggu`}
          />
          <QuickTile
            href="/reports"
            icon={CreditCard}
            tone="bg-[#e8f0fe] text-brand"
            title="Rekap Pencairan"
            caption="Pencairan & pengeluaran"
          />
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="whitespace-nowrap text-[15px] font-bold tracking-tight text-slate-900">Pengajuan Terbaru</h2>
            <FilterTabs filter={filter} pendingCount={stats.pendingCount} kind={kind} size="sm" />
          </div>
          <KindFilter />

          <KindFilterContent>
          {list.length === 0 && (
            <p className="text-sm text-slate-500">Belum ada pengajuan.</p>
          )}
          <div className="space-y-4">
            {list.map((ca) => {
              const action = MOBILE_ACTION[ca.status] ?? MOBILE_ACTION.closed;
              return (
                <article
                  key={ca.id}
                  className="rounded-[22px] border border-slate-200/90 bg-white p-4 shadow-[0_2px_6px_-2px_rgba(0,0,0,0.03)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <KindTag kind={ca.kind} />
                      <p className="truncate text-[15px] font-bold text-slate-900">
                        {ca.profiles?.full_name ?? "-"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {formatDateTimeShort(ca.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <StatusBadge status={ca.status} />
                      {pendingTransferLabel(ca) && (
                        <span className="text-[11px] font-medium text-amber-700">
                          {pendingTransferLabel(ca)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-[13px] font-semibold leading-snug text-slate-900">
                      {ca.purpose}
                    </p>
                    <p className="shrink-0 text-right text-[11px] font-bold leading-tight text-slate-900">
                      Rp
                      <span className="block text-sm">{formatNumber(ca.amount_requested)}</span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => openReview(ca.id)}
                    className={
                      action.primary
                        ? "mt-3 ml-auto flex w-fit items-center rounded-full bg-[#0f172a] px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
                        : "mt-3 flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                    }
                  >
                    {action.label}
                  </button>
                </article>
              );
            })}
          </div>
          </KindFilterContent>
          <Pagination page={page} total={count} pageSize={PAGE_SIZE} basePath={basePath} params={filterParams} />
        </section>
      </div>

      {/* ───────── Desktop ───────── */}
      <div className="hidden lg:block">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[19px] text-slate-600">Selamat Datang</p>
            <h1 className="mt-1 text-[28px] leading-tight font-extrabold tracking-tight text-slate-900">{name}</h1>
          </div>
          <div className="flex items-center gap-3 pt-3">
            <RoleBadge dot dark>Operasional</RoleBadge>
            <span className="rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-semibold text-slate-700">
              Hari ini, {formatDateLong()}
            </span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-4 gap-5">
          <StatCard dark dot label="Menunggu" value={stats.pendingCount} caption="Butuh verifikasi dokumen" />
          <StatCard
            label="Saldo berjalan"
            value={formatCompactIdr(stats.totalOutstanding).replace("Rp ", "")}
            caption="Total sisa saldo CA berjalan"
            valueClass="text-2xl mt-6"
            icon={TrendingUp}
            iconClass="text-emerald-500"
          />
          <StatCard label="CA berjalan" value={stats.activeCount} caption="Dalam proses kegiatan" icon={Clock} iconClass="text-brand" />
          <StatCard label="Perlu SPJ" value={stats.needsSpjCount} caption="Menunggu pelaporan kuitansi" icon={TriangleAlert} iconClass="text-amber-500" />
        </div>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between px-5 py-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Pengajuan terbaru</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Klik baris atau tombol aksi untuk melihat detail pengajuan.
              </p>
            </div>
            <FilterTabs filter={filter} pendingCount={stats.pendingCount} kind={kind} />
          </div>
          <div className="px-5 pb-4">
            <KindFilter />
          </div>

          <table className="w-full border-t border-slate-200 text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className={TH}>Pemohon</th>
                <th className={TH}>Kegiatan</th>
                <th className={TH}>Tgl Pengajuan</th>
                <th className={`${TH} text-right`}>Nominal (Rp)</th>
                <th className={`${TH} text-center`}>Status</th>
                <th className={`${TH} text-center`}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-slate-500">
                    Belum ada pengajuan.
                  </td>
                </tr>
              )}
              {list.map((ca) => {
                const isPending = ca.status === "pending";
                return (
                  <tr
                    key={ca.id}
                    onClick={() => openReview(ca.id)}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <td className="px-5 py-4 whitespace-nowrap text-[13px] font-semibold text-slate-900">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openReview(ca.id);
                        }}
                        className="hover:text-brand transition-colors text-left font-semibold"
                      >
                        {ca.profiles?.full_name ?? "-"}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-slate-600">
                      <KindTag kind={ca.kind} />
                      {ca.purpose}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-[13px] text-slate-700">
                      {formatDateLong(ca.created_at)}
                    </td>
                    <td className="px-5 py-4 text-right text-[13px] font-bold text-slate-900">
                      {formatNumber(ca.amount_requested)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <StatusBadge status={ca.status} />
                      {pendingTransferLabel(ca) && (
                        <p className="mt-1 text-[11px] font-medium text-amber-700">
                          {pendingTransferLabel(ca)}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openReview(ca.id);
                        }}
                        className={
                          isPending
                            ? "inline-block whitespace-nowrap rounded-xl bg-[#0f172a] px-4 py-2.5 text-[11px] font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
                            : "inline-block rounded-lg bg-slate-100 px-5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                        }
                      >
                        {isPending ? "Tinjau Pengajuan" : "Lihat"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-6 pb-4 empty:hidden">
            <Pagination page={page} total={count} pageSize={PAGE_SIZE} basePath={basePath} params={filterParams} />
          </div>
        </section>
      </div>

      {/* ───────── Pop Up Modal Tinjau Pengajuan ───────── */}
      <CashAdvanceReviewModal
        isOpen={!!reviewCa}
        onClose={() => openReview(null)}
        ca={reviewCa}
        onPrev={handlePrevReview}
        onNext={handleNextReview}
        hasPrev={!!prevCa}
        hasNext={!!nextCa}
        currentUserId={currentUserId}
        canReview
        onDecisionComplete={handleDecisionComplete}
        nextPendingCount={pendingOthers.length}
        onGoNext={handleGoNextPending}
        startWithDetail={!!reviewCa && reviewCa.id === autoDetailId}
      />
    </div>
    </KindFilterProvider>
  );
}
