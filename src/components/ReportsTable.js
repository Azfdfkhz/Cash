"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { formatCurrency, formatDate, toCsvValue, downloadCsv } from "@/lib/utils";

export default function ReportsTable({ rows }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter(
      (r) =>
        r.requesterName?.toLowerCase().includes(q) ||
        r.vendor?.toLowerCase().includes(q) ||
        r.purpose?.toLowerCase().includes(q)
    );
  }, [rows, query]);

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
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari requester, vendor, keperluan..."
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
        />
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 bg-slate-900 text-white text-sm font-medium rounded-lg px-3 py-2 shrink-0"
        >
          <Download size={16} /> CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between">
        <span className="text-sm text-slate-500">
          {filtered.length} kwitansi
        </span>
        <span className="text-sm font-semibold text-slate-900">
          {formatCurrency(total)}
        </span>
      </div>

      <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
              <th className="px-3 py-2 font-medium">Tanggal</th>
              <th className="px-3 py-2 font-medium">Requester</th>
              <th className="px-3 py-2 font-medium">Keperluan CA</th>
              <th className="px-3 py-2 font-medium">Vendor</th>
              <th className="px-3 py-2 font-medium text-right">Nominal</th>
              <th className="px-3 py-2 font-medium">Foto</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                  {r.receiptDate ? formatDate(r.receiptDate) : "-"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{r.requesterName}</td>
                <td className="px-3 py-2 max-w-[160px] truncate">{r.purpose}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.vendor || "-"}</td>
                <td className="px-3 py-2 whitespace-nowrap text-right font-medium">
                  {formatCurrency(r.amount)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.driveUrl ? (
                    <a
                      href={r.driveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand"
                    >
                      Lihat
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                  Tidak ada data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
