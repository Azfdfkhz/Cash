"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Check, Clock, CheckCheck, X, Info, TrendingUp } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";
import NextAction from "@/components/NextAction";
import CompactIdr from "@/components/CompactIdr";
import ReturnPendingBadge from "@/components/ReturnPendingBadge";
import Pagination from "@/components/Pagination";
import KindFilter, { KindFilterContent, KindFilterProvider } from "@/components/KindFilter";
import CashAdvanceReviewModal from "@/components/CashAdvanceReviewModal";
import { PAGE_SIZE } from "@/lib/pagination";
import { TableBodySkeleton } from "@/components/skeletons/ListSkeletons";
import {
  formatCurrency,
  formatDateLong,
  formatDateShort,
  formatNumber,
  KIND_LABEL,
  hasPendingReturn,
} from "@/lib/utils";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { RoleBadge, StatCard, TH } from "./parts";

// Requester perlu lihat langsung saat Ops memutuskan/mencairkan pengajuannya,
// atau saat pengembalian/penggantiannya dikonfirmasi -- tanpa reload manual.
const REALTIME_TABLES = [
  "cash_advances",
  "cash_advance_returns",
  "cash_advance_reimbursements",
];

const STATUS_TILE = {
  approved: { bg: "bg-[#e8f8ee]", icon: Check, color: "text-[#1fa653]" },
  pending: { bg: "bg-[#fff7e8]", icon: Clock, color: "text-[#d98a0b]" },
  closed: { bg: "bg-[#eef2f6]", icon: CheckCheck, color: "text-slate-500" },
  rejected: { bg: "bg-[#fff0f2]", icon: X, color: "text-[#e11d48]" },
};

function KindTag({ kind }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wide text-brand">
      {KIND_LABEL[kind] ?? "Cash Advance"}
    </p>
  );
}

function Metric({ value, label, tour }) {
  return (
    <div data-tour={tour} className="min-w-0 flex-1">
      <p className="break-words text-lg font-bold leading-tight text-slate-900">{value}</p>
      <p className="text-xs font-medium text-slate-400">{label}</p>
    </div>
  );
}

export default function RequesterDashboard({ name, stats, list, count, page, kind, currentUserId, focusCa = null }) {
  // Auto-refresh: status berubah (disetujui/ditolak/dicairkan) atau
  // pengembalian/penggantiannya dikonfirmasi -> tabel & badge status
  // perbarui diri sendiri tanpa reload manual.
  useRealtimeRefresh(REALTIME_TABLES);
  const [viewCaId, setViewCaId] = useState(focusCa?.id ?? null);
  // Dibuka dari tautan (?ca=): langsung tampilkan pop up detail.
  const [autoDetailId, setAutoDetailId] = useState(focusCa?.id ?? null);
  const viewIndex = list.findIndex((ca) => ca.id === viewCaId);
  function openView(id) {
    setAutoDetailId(null);
    setViewCaId(id);
  }
  const viewCa =
    viewIndex >= 0 ? list[viewIndex] : focusCa && focusCa.id === viewCaId ? focusCa : null;

  const filterParams = { jenis: kind };
  const emptyText = `Belum ada pengajuan${kind ? " dengan jenis ini" : ""}.`;
  const hasMore = (count ?? 0) > PAGE_SIZE;
  const viewAll = hasMore ? (
    <Link
      href={`/dashboard?${kind ? `jenis=${kind}&` : ""}page=2`}
      className="text-sm font-semibold text-brand hover:underline"
    >
      Lihat Semua
    </Link>
  ) : null;

  return (
    <KindFilterProvider basePath="/dashboard" active={kind}>
    <div>
      {/* ───────── Mobile ───────── */}
      <div className="lg:hidden space-y-5">
        <div className="flex items-end justify-between pt-2">
          <div>
            <p className="text-sm font-medium text-slate-500">Selamat datang</p>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              {name}
            </h1>
          </div>
          <div className="pb-1">
            <RoleBadge dark>Requester</RoleBadge>
          </div>
        </div>

        <section data-tour="stat-balance" className="rounded-[28px] border border-slate-200/90 bg-white px-6 pb-6 pt-7 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)]">
          <p className="text-[13px] font-medium text-slate-500">Sisa saldo aktif</p>
          <p className="pb-4 pt-1.5 text-[32px] font-extrabold leading-8 tracking-tight text-[#0d1b2a]">
            {formatCurrency(stats.totalOutstanding)}
          </p>
          <div className="flex gap-2 border-t border-slate-100 pt-4">
            <Metric value={stats.activeCount} label="CA aktif" tour="stat-active" />
            <Metric value={stats.pendingCount} label="Belum disetujui" tour="stat-pending" />
            <Metric value={<CompactIdr value={stats.totalReturned} />} label="Dikembalikan" tour="stat-returned" />
          </div>
        </section>

        <Link
          href="/cash-advances/new"
          className="flex items-center justify-center gap-2.5 rounded-2xl bg-[#0f172a] py-4 text-base font-bold text-white shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-slate-800 transition-colors"
        >
          <Plus size={20} strokeWidth={2} />
          Buat Pengajuan
        </Link>

        <section className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Pengajuan Terbaru
            </h2>
            {viewAll}
          </div>
          <KindFilter />

          <KindFilterContent>
          {list.length === 0 && (
            <p className="text-sm text-slate-500">{emptyText}</p>
          )}
          <div data-tour="request-list" className="space-y-3.5">
            {list.map((ca, i) => {
              const tile = STATUS_TILE[ca.status] ?? STATUS_TILE.closed;
              const Icon = tile.icon;
              return (
                <button
                  key={ca.id}
                  type="button"
                  onClick={() => openView(ca.id)}
                  data-tour={i === 0 ? "row-action" : undefined}
                  className="flex w-full items-center justify-between gap-3 text-left rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_2px_6px_-2px_rgba(0,0,0,0.03)] transition-colors hover:border-slate-300"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tile.bg}`}
                    >
                      <Icon size={22} strokeWidth={2} className={tile.color} />
                    </div>
                    <div className="min-w-0">
                      <KindTag kind={ca.kind} />
                      <p className="line-clamp-2 text-sm font-bold leading-snug text-slate-900">
                        {ca.purpose}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDateShort(ca.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <p className="text-sm font-bold text-slate-900">
                      {formatCurrency(ca.amount_requested)}
                    </p>
                    <StatusBadge status={ca.status} />
                    <NextAction ca={ca} operational={false} className="" />
                    {hasPendingReturn(ca) && (
                      <ReturnPendingBadge className="" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          </KindFilterContent>
          <Pagination page={page} total={count} pageSize={PAGE_SIZE} basePath="/dashboard" params={filterParams} />
        </section>
      </div>

      {/* ───────── Desktop ───────── */}
      <div className="hidden lg:block">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xl font-light text-slate-500">Selamat Datang</p>
            <h1 className="mt-1 text-3xl leading-tight font-bold tracking-tight text-slate-900 2xl:text-4xl">
              {name}
            </h1>
          </div>
          <div className="flex items-center gap-4 pt-1">
            <RoleBadge dot>Requester</RoleBadge>
            <span className="text-xs font-medium text-slate-600 px-3.5">
              Hari Ini, {formatDateLong()}
            </span>
          </div>
        </div>

        <div className="mt-7 grid grid-cols-4 gap-4 xl:gap-5">
          <StatCard tour="stat-balance" dark label="Sisa saldo aktif" value={formatCurrency(stats.totalOutstanding)} caption="" valueClass="text-xl mt-8 whitespace-nowrap" />
          <StatCard tour="stat-active" label="CA aktif" value={stats.activeCount} caption="Dalam proses kegiatan" icon={Clock} />
          <StatCard tour="stat-pending" label="Belum Disetujui" value={stats.pendingCount} caption="Menunggu keputusan Operasional" icon={Info} />
          <StatCard tour="stat-returned" label="Dikembalikan" value={<CompactIdr value={stats.totalReturned} />} caption="Total pengembalian" icon={TrendingUp} valueClass="text-2xl mt-6" />
        </div>

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-200/30">
          <div className="flex items-center justify-between gap-4 px-5 py-4 xl:px-6 xl:py-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Pengajuan terbaru</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Klik baris atau tombol aksi untuk melihat detail pengajuan.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <KindFilter />
              {viewAll}
            </div>
          </div>

          <table data-tour="request-list" className="w-full border-t border-slate-200 text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className={TH}>Kegiatan</th>
                <th className={TH}>Tgl Pengajuan</th>
                <th className={TH}>Nominal (Rp)</th>
                <th className={`${TH} text-center`}>Status</th>
                <th className={`${TH} text-center`}>Aksi</th>
              </tr>
            </thead>
            <KindFilterContent fallback={<TableBodySkeleton rows={4} cols={5} />}>
            <tbody>
              {list.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                    {emptyText}
                  </td>
                </tr>
              )}
              {list.map((ca, i) => (
                <tr
                  key={ca.id}
                  className="relative cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50/70"
                >
                  <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-slate-900">
                    <button
                      type="button"
                      onClick={() => openView(ca.id)}
                      className="text-left after:absolute after:inset-0"
                    >
                      <KindTag kind={ca.kind} />
                      {ca.purpose}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-6 py-5 text-sm text-slate-600">
                    {formatDateLong(ca.created_at)}
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-slate-900">
                    {formatNumber(ca.amount_requested)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center gap-1">
<StatusBadge status={ca.status} />
<NextAction ca={ca} operational={false} as="p" className="!text-center" />
{hasPendingReturn(ca) && (
<ReturnPendingBadge className="" />
)}
</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span data-tour={i === 0 ? "row-action" : undefined} className="inline-block rounded-lg bg-[#eef2f6] px-4 py-1.5 text-xs font-medium text-[#334155]">
                      Lihat
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            </KindFilterContent>
          </table>
          <div className="px-6 pb-4 empty:hidden">
            <Pagination page={page} total={count} pageSize={PAGE_SIZE} basePath="/dashboard" params={filterParams} />
          </div>
        </section>
      </div>

      <CashAdvanceReviewModal
        isOpen={!!viewCa}
        onClose={() => openView(null)}
        ca={viewCa}
        onPrev={() => viewIndex > 0 && openView(list[viewIndex - 1].id)}
        onNext={() => viewIndex < list.length - 1 && openView(list[viewIndex + 1].id)}
        hasPrev={viewIndex > 0}
        hasNext={viewIndex >= 0 && viewIndex < list.length - 1}
        currentUserId={currentUserId}
        startWithDetail={!!viewCa && viewCa.id === autoDetailId}
      />
    </div>
    </KindFilterProvider>
  );
}
