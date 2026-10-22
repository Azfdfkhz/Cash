"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isDemoId } from "@/lib/tour/demoData";

// `onDecided(status, note)` dipanggil setelah keputusan tersimpan, sebelum
// data di-refresh (dipakai Persetujuan untuk menampilkan pop up lanjutan).
export default function ApprovalActions({ cashAdvanceId, variant = "card", onDecided }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Ref (bukan state) karena harus efektif SEBELUM render berikutnya --
  // mencegah klik ganda yang sangat cepat memicu dua keputusan sekaligus
  // (state `loading` baru membuat tombol disabled setelah re-render).
  const busyRef = useRef(false);

  async function decide(status) {
    if (isDemoId(cashAdvanceId)) return; // pengajuan contoh milik tur: tidak pernah disimpan
    if (busyRef.current) return;
    setError("");
    if (variant === "panel" && status === "rejected" && !note.trim()) {
      setError("Catatan wajib diisi jika menolak pengajuan.");
      return;
    }
    busyRef.current = true;
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("cash_advances")
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_note: note || null,
      })
      .eq("id", cashAdvanceId);

    setLoading(false);

    if (error) {
      setError("Gagal memperbarui status.");
      busyRef.current = false;
      return;
    }

    if (status === "approved" || status === "rejected") {
      fetch(`/api/cash-advances/${cashAdvanceId}/notify-decision`, {
        method: "POST",
      }).catch(() => {});
    }

    onDecided?.(status, note.trim() || null);
    router.refresh();
    // busyRef sengaja TIDAK direset di sini: komponen ini biasanya di-unmount
    // atau dirender ulang dengan props baru setelah router.refresh(), jadi
    // tidak perlu dibuka lagi untuk keputusan yang sama.
  }

  if (variant === "panel") {
    return (
      <>
        <div className="px-6 pt-5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Catatan <span className="text-rose-600">(wajib diisi jika menolak)</span>
            </label>
            <span className="text-xs text-slate-600">
              Opsional untuk persetujuan
            </span>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Tulis catatan verifikasi atau alasan jika pengajuan ini ditolak..."
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          />
          {error && (
            <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">
              {error}
            </p>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            onClick={() => decide("rejected")}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full border border-rose-300 px-6 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
          >
            <X size={16} /> Tolak
          </button>
          <button
            onClick={() => decide("approved")}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full bg-dark-navy px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            <Check size={16} /> Setujui Pengajuan
          </button>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <p className="text-sm font-semibold text-slate-700">
        Tindakan Persetujuan
      </p>
      {error && (
        <div role="alert" className="font-medium text-sm text-rose-800 bg-rose-50 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Catatan (opsional)"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
      />
      <div className="flex gap-2">
        <button
          onClick={() => decide("approved")}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2.5"
        >
          <Check size={16} /> Setujui
        </button>
        <button
          onClick={() => decide("rejected")}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2.5"
        >
          <X size={16} /> Tolak
        </button>
      </div>
    </div>
  );
}
