"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";

// Konfirmasi "Batalkan Selesai" (tinjau ulang). Dipanggil dari footer panel
// tinjau, di sebelah tombol Tutup dan Lihat Detail. Server yang menghapus
// laporan PDF di Drive + mengosongkan data laporan, lalu membuka status.
// Seperti cash-advance-app: Ops mencentang pengembalian yang dananya belum
// masuk (kembali "menunggu konfirmasi"); yang tidak dicentang tetap terkonfirmasi.
export default function ReopenDialog({ ca, onCancel, onDone }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);
  const [confirmedReturns, setConfirmedReturns] = useState([]);
  const [unconfirmIds, setUnconfirmIds] = useState([]);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("cash_advance_returns")
      .select("id, amount, created_at, note")
      .eq("cash_advance_id", ca.id)
      .not("confirmed_at", "is", null)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!cancelled) setConfirmedReturns(data ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [ca.id]);

  const balance = Number(ca.amount_requested || 0) - Number(ca.total_spent || 0);

  async function handleConfirm() {
    if (busyRef.current) return;
    if (reason.trim().length < 3) {
      setError("Tulis alasan tinjau ulang supaya pemohon tahu apa yang harus diperbaiki.");
      return;
    }
    if (confirmedReturns.length && balance > 0 && !unconfirmIds.length) {
      setError("Pilih pengembalian yang dananya belum masuk.");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/cash-advances/${ca.id}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim(), unconfirmReturnIds: unconfirmIds }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal membatalkan status selesai.");
      }
      onDone();
    } catch (err) {
      setError(err.message || "Gagal membatalkan status selesai.");
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <div
      className="animate-fade-in absolute inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-label="Batalkan status selesai"
    >
      <div className="animate-scale-up w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <RotateCcw size={20} />
        </span>
        <h3 className="mt-3 text-sm font-bold text-slate-900">Batalkan status Selesai?</h3>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-600">
          <li>Laporan PDF di Drive dan datanya dihapus.</li>
          <li>Status kembali ke Disetujui; pengembalian yang Anda centang menunggu konfirmasi lagi, sisanya tetap terkonfirmasi.</li>
          <li>Kwitansi dan bukti transfer tetap ada untuk diperbaiki.</li>
          <li>Kwitansi pengajuan ini disembunyikan dari halaman Laporan sampai ditutup lagi.</li>
          <li>Pemohon diberi tahu lewat notifikasi Telegram dan banner di pengajuan.</li>
        </ul>
        {confirmedReturns.length > 0 && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-semibold text-slate-700">
              Batalkan konfirmasi pengembalian yang dananya belum masuk:
            </p>
            {confirmedReturns.map((r) => (
              <label
                key={r.id}
                className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs"
              >
                <input
                  type="checkbox"
                  checked={unconfirmIds.includes(r.id)}
                  onChange={(e) =>
                    setUnconfirmIds((ids) =>
                      e.target.checked ? [...ids, r.id] : ids.filter((x) => x !== r.id)
                    )
                  }
                />
                <span className="font-semibold text-slate-900">{formatCurrency(r.amount)}</span>
                <span className="text-slate-500">
                  {formatDate(r.created_at)}
                  {r.note ? ` · ${r.note}` : ""}
                </span>
              </label>
            ))}
          </div>
        )}
        <label htmlFor="reopen-reason" className="mt-3 block text-xs font-semibold text-slate-700">
          Catatan untuk pemohon (wajib)
        </label>
        <textarea
          id="reopen-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Contoh: Nominal kwitansi toko A tidak sesuai bukti, mohon unggah ulang."
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/10"
        />
        {error && (
          <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">
            {error}
          </p>
        )}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-full border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Tidak
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className={`flex-1 rounded-full py-2 text-xs font-bold transition-colors disabled:opacity-60 ${
              reason.trim().length >= 3
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "bg-slate-200 text-slate-500"
            }`}
          >
            {busy ? "Membatalkan..." : "Ya, Batalkan Selesai"}
          </button>
        </div>
      </div>
    </div>
  );
}
