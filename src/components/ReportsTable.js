"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Building2,
  Calendar,
  Check,
  Download,
  Eye,
  ExternalLink,
  FileText,
  Search,
  X,
} from "lucide-react";
import { formatCurrency, formatDateNumeric } from "@/lib/utils";
import { FilePreviewModal, fileDownloadHref } from "@/components/FilePreview";
import { PendingNavProvider, usePendingNav } from "@/components/PendingNav";
import { ReceiptListSkeleton } from "@/components/skeletons/ListSkeletons";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";

// Laporan menampilkan rekap kwitansi -- kwitansi baru/diubah harus langsung
// masuk tabel & total tanpa reload manual.
const REALTIME_TABLES = ["receipts", "receipt_lines"];

// Ambil ID file dari URL Google Drive → URL pratinjau & unduh.
function driveIds(url) {
  const m = url?.match(/\/file\/d\/([^/?#]+)/) || url?.match(/[?&]id=([^&#]+)/);
  const id = m?.[1];
  return id
    ? {
        preview: `https://drive.google.com/file/d/${id}/preview`,
        download: `https://drive.google.com/uc?export=download&id=${id}`,
      }
    : { preview: null, download: null };
}

const KIND_OPTIONS = [
  ["cash_advance", "Cash Advance"],
  ["reimbursement", "Reimbursement"],
];

// Mobile: daftar kartu kwitansi (tombol membuka foto di Drive).
// Desktop (≥lg): daftar di kiri + pratinjau kwitansi di kanan.
//
// Data per halaman datang dari server (`rows` = satu halaman saja, `total` &
// `totalAmount` = jumlah seluruh hasil filter). Pencarian, tanggal, dan jenis
// disimpan di URL (?q=&tanggal=&jenis=) dan diterapkan di database; mengganti
// filter kembali ke halaman 1. `pagination` hanya muncul kalau hasilnya lebih
// dari satu halaman.
export default function ReportsTable(props) {
  return (
    <PendingNavProvider>
      <ReportsTableInner {...props} />
    </PendingNavProvider>
  );
}

function ReportsTableInner({
  rows,
  total,
  totalAmount,
  filters,
  pagination,
}) {
  const pathname = usePathname();
  const { pending, navigate } = usePendingNav();
  // Kwitansi baru dari requester lain langsung muncul tanpa reload manual.
  useRealtimeRefresh(REALTIME_TABLES);
  const [query, setQuery] = useState(filters.q);
  const [selectedId, setSelectedId] = useState(null);
  // Mobile: "Lihat Kwitansi" membuka pop up pratinjau (bukan pindah halaman).
  const [modalId, setModalId] = useState(null);
  const lastPushedQuery = useRef(filters.q);

  function go(next) {
    const merged = { ...filters, ...next };
    const qs = new URLSearchParams();
    if (merged.q) qs.set("q", merged.q);
    if (merged.date) qs.set("tanggal", merged.date);
    if (merged.kind) qs.set("jenis", merged.kind);
    const str = qs.toString();
    navigate(str ? `${pathname}?${str}` : pathname, { replace: true, scroll: false });
  }

  // Pencarian ditunda sebentar supaya tidak meminta ke database di tiap ketikan.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === lastPushedQuery.current) return undefined;
    const t = setTimeout(() => {
      lastPushedQuery.current = trimmed;
      go({ q: trimmed });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const selected = rows.find((r) => r.id === selectedId) ?? null;
  const ids = driveIds(selected?.driveUrl);
  const modalRow = rows.find((r) => r.id === modalId) ?? null;
  const receiptName = (r) =>
    ["kwitansi", r?.vendor, r?.receiptDate].filter(Boolean).join(" ");
  // Unduhan lewat server: berkas asli, dicek akses user (bukan tautan Drive).
  const selectedDownload = selected ? fileDownloadHref(selected.driveUrl, receiptName(selected)) : null;

  const exportParams = new URLSearchParams();
  if (filters.q) exportParams.set("q", filters.q);
  if (filters.date) exportParams.set("tanggal", filters.date);
  if (filters.kind) exportParams.set("jenis", filters.kind);
  const exportHref = `/api/reports/export${exportParams.size ? `?${exportParams}` : ""}`;

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
      <div className="space-y-3">
        <div data-tour="report-filters" className="space-y-3">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari requester, vendor, keperluan, kategori..."
            aria-label="Cari laporan"
            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tanggal ditampilkan hari/bulan/tahun (bukan "mm/dd/yyyy" bawaan browser).
            Input date asli tetap dipakai sebagai pemilih, ditaruh transparan di atas. */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <div
              className={`flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 text-sm ${
                filters.date ? "border-brand text-slate-900" : "border-slate-300 text-slate-500"
              }`}
            >
              <Calendar size={15} className="shrink-0 text-slate-500" />
              <span className="font-num truncate">
                {filters.date ? formatDateNumeric(filters.date) : "Semua tanggal kwitansi"}
              </span>
            </div>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => go({ date: e.target.value })}
              onClick={(e) => e.currentTarget.showPicker?.()}
              aria-label="Filter tanggal kwitansi"
              lang="id-ID"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
          {filters.date && (
            <button
              type="button"
              onClick={() => go({ date: "" })}
              className="shrink-0 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hapus tanggal
            </button>
          )}
        </div>

        <div className="flex border-b border-slate-200" role="tablist" aria-label="Jenis pengajuan">
          {KIND_OPTIONS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filters.kind === value}
              onClick={() => value !== filters.kind && go({ kind: value })}
              className={`-mb-px flex flex-1 items-center justify-center border-b-2 px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                filters.kind === value
                  ? "border-brand text-brand"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        </div>
        <div data-tour="report-summary" className={`flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-opacity ${pending ? "opacity-50" : ""}`}>
          <span className="font-num text-sm text-slate-500">{total} kwitansi</span>
          <div className="flex items-center gap-3">
            <span className="font-num text-base font-bold text-slate-900">
              {formatCurrency(totalAmount)}
            </span>
            <a
              href={exportHref}
              download
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-dark-navy px-3 py-1.5 text-xs font-semibold text-white"
            >
              <Download size={14} /> CSV
            </a>
          </div>
        </div>

        {pending ? (
          <ReceiptListSkeleton rows={4} />
        ) : (
        <div className="space-y-3">
          {rows.length === 0 && (
            <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
              Tidak ada data.
            </p>
          )}
          {rows.map((r) => {
            const active = r.id === selected?.id;
            return (
              <div
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                className={`rounded-2xl border bg-white p-4 lg:cursor-pointer ${
                  active
                    ? "lg:border-brand lg:ring-2 lg:ring-primary-ring border-slate-200"
                    : "border-slate-200 lg:hover:border-slate-300"
                }`}
              >
                <p className="font-num text-xs text-slate-500">
                  {r.receiptDate ? formatDateNumeric(r.receiptDate) : "-"}
                </p>
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-muted text-brand">
                      <Building2 size={18} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {r.vendor || "-"}
                      </p>
                      <p className="truncate text-xs text-slate-500">{r.purpose}</p>
                      <p className="truncate text-[11px] text-slate-500">
                        {r.kind}
                        {r.category ? ` · ${r.category}` : ""}
                      </p>
                    </div>
                  </div>
                  <p className="font-num shrink-0 text-sm font-bold text-slate-900">
                    {formatCurrency(r.amount)}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-slate-500">
                    {r.requesterName}
                  </span>
                  {r.driveUrl && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalId(r.id);
                        }}
                        className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary-muted px-3.5 text-xs font-semibold text-brand lg:hidden"
                      >
                        <Eye size={14} /> Lihat Kwitansi
                      </button>
                      <span
                        className={`hidden shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold lg:inline-flex ${
                          active
                            ? "bg-brand text-white"
                            : "bg-primary-muted text-brand"
                        }`}
                      >
                        {active ? <Check size={13} /> : <Eye size={13} />}
                        {active ? "Sedang dilihat" : "Lihat Kwitansi"}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}

        {!pending && pagination}
      </div>

      <aside className="hidden lg:block lg:sticky lg:top-8">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          {selected ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Pratinjau kwitansi
                  </p>
                  <p className="truncate text-sm font-bold text-slate-900">
                    {selected.vendor || "Kwitansi"} · <span className="font-num">{formatCurrency(selected.amount)}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Tutup pratinjau"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 px-5 py-3 text-xs text-slate-500">
                <span className="flex min-w-0 items-center gap-1.5">
                  <FileText size={14} className="shrink-0" />
                  <span className="truncate">
                    {selected.vendor || "kwitansi"}
                    {selected.receiptDate ? ` · ${formatDateNumeric(selected.receiptDate)}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-slate-500">Tersimpan di Google Drive</span>
              </div>

              <div className="bg-slate-50 px-5 pb-5">
                {ids.preview ? (
                  <iframe
                    key={selected.id}
                    src={ids.preview}
                    title="Pratinjau kwitansi"
                    className="h-[28rem] w-full rounded-xl border border-slate-200 bg-white"
                  />
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-16 text-center text-sm text-slate-500">
                    {selected.driveUrl
                      ? "Pratinjau tidak tersedia untuk tautan ini. Buka di Drive."
                      : "Kwitansi ini belum punya foto."}
                  </p>
                )}
              </div>

              {selected.driveUrl && (
                <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
                  <a
                    href={selected.driveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink size={14} /> Buka di Drive
                  </a>
                  {selectedDownload && (
                    <a
                      href={selectedDownload}
                      download
                      className="inline-flex items-center gap-1.5 rounded-lg bg-dark-navy px-4 py-2 text-xs font-semibold text-white"
                    >
                      <Download size={14} /> Unduh
                    </a>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="px-6 py-24 text-center text-sm text-slate-500">
              Pilih kwitansi di daftar untuk melihat pratinjau.
            </p>
          )}
        </div>
      </aside>

      <FilePreviewModal
        open={!!modalRow}
        onClose={() => setModalId(null)}
        title={modalRow ? `${modalRow.vendor || "Kwitansi"} · ${formatCurrency(modalRow.amount)}` : ""}
        url={modalRow?.driveUrl}
        downloadName={modalRow ? receiptName(modalRow) : undefined}
      />
    </div>
  );
}
