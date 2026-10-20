"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// `onDecided(status, note)` dipanggil setelah keputusan tersimpan, sebelum
// data di-refresh (dipakai Persetujuan untuk menampilkan pop up lanjutan).
export default function ApprovalActions({ cashAdvanceId, variant = "card", onDecided }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function decide(status) {
    setError("");
    if (variant === "panel" && status === "rejected" && !note.trim()) {
      setError("Catatan wajib diisi jika menolak pengajuan.");
      return;
    }
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
      return;
    }

    if (status === "approved" || status === "rejected") {
      fetch(`/api/cash-advances/${cashAdvanceId}/notify-decision`, {
        method: "POST",
      }).catch(() => {});
    }

    onDecided?.(status, note.trim() || null);
    router.refresh();
  }

  if (variant === "panel") {
    return (
      <>
        <div className="px-6 pt-5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              Catatan <span className="text-rose-500">(wajib diisi jika menolak)</span>
            </label>
            <span className="text-[11px] text-slate-400">
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
          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
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
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      <p className="text-sm font-semibold text-slate-700">
        Tindakan Persetujuan
      </p>
      {error && (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
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
