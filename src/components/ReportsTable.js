"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  Check,
  Download,
  Eye,
  ExternalLink,
  FileText,
  X,
} from "lucide-react";
import { formatCurrency, formatDate, toCsvValue, downloadCsv } from "@/lib/utils";

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

// Mobile: daftar kartu kwitansi (tombol membuka foto di Drive).
// Desktop (≥lg): daftar di kiri + pratinjau kwitansi di kanan.
export default function ReportsTable({ rows }) {
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (date && r.receiptDate?.slice(0, 10) !== date) return false;
      if (!q) return true;
      return (
        r.requesterName?.toLowerCase().includes(q) ||
        r.vendor?.toLowerCase().includes(q) ||
        r.purpose?.toLowerCase().includes(q)
      );
    });
  }, [rows, query, date]);

  const selected = filtered.find((r) => r.id === selectedId) ?? null;
  const ids = driveIds(selected?.driveUrl);

  function exportCsv() {
    const header = [
      "Tanggal Kwitansi",
      "Requester",
      "Keperluan CA",
      "Vendor",
      "Nominal",
      "Catatan",
      "Link Foto",
    ];
    const lines = filtered.map((r) =>
      [
        r.receiptDate ? formatDate(r.receiptDate) : "-",
        r.requesterName,
        r.purpose,
        r.vendor,
        r.amount,
        r.notes,
        r.driveUrl,
      ]
        .map(toCsvValue)
        .join(",")
    );
    downloadCsv(`laporan-cash-advance-${new Date().toISOString().slice(0, 10)}.csv`, [
      header.join(","),
      ...lines,
    ]);
  }

  const total = filtered.reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
      <div className="space-y-3">
        <div className="flex gap-2">
          <label className="relative shrink-0">
            <Calendar
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-label="Filter tanggal kwitansi"
              className="w-[9.5rem] rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari requester, vendor, keperluan..."
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <span className="text-sm text-slate-500">{filtered.length} kwitansi</span>
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-slate-900">
              {formatCurrency(total)}
            </span>
            <button
              onClick={exportCsv}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-dark-navy px-3 py-1.5 text-xs font-semibold text-white"
            >
              <Download size={14} /> CSV
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 && (
            <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
              Tidak ada data.
            </p>
          )}
          {filtered.map((r) => {
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
                <p className="text-xs text-slate-500">
                  {r.receiptDate ? formatDate(r.receiptDate) : "-"}
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
                    </div>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-slate-900">
                    {formatCurrency(r.amount)}
                  </p>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-slate-500">
                    {r.requesterName}
                  </span>
                  {r.driveUrl && (
                    <>
                      <a
                        href={r.driveUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary-muted px-3 py-1.5 text-xs font-semibold text-brand lg:hidden"
                      >
                        <Eye size={13} /> Lihat Kwitansi
                      </a>
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
      </div>

      <aside className="hidden lg:block lg:sticky lg:top-8">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          {selected ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Pratinjau kwitansi
                  </p>
                  <p className="truncate text-sm font-bold text-slate-900">
                    {selected.vendor || "Kwitansi"} · {formatCurrency(selected.amount)}
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
                    {selected.receiptDate ? ` · ${formatDate(selected.receiptDate)}` : ""}
                  </span>
                </span>
                <span className="shrink-0 text-slate-400">Tersimpan di Google Drive</span>
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
                  {ids.download && (
                    <a
                      href={ids.download}
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
    </div>
  );
}
