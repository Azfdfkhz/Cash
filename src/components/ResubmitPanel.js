"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notifyOps } from "@/lib/receiptScan";

export default function ResubmitPanel({ cashAdvanceId, kind }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleResubmit() {
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("resubmit_cash_advance", {
      target_id: cashAdvanceId,
      note: note.trim() || null,
    });
    setLoading(false);

    if (error) {
      setError(error.message || "Gagal mengajukan ulang.");
      return;
    }
    notifyOps(cashAdvanceId, { event: "resubmitted", note: note.trim() || null });
    setNote("");
    router.refresh();
  }

  return (
    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-rose-800">Pengajuan ditolak</p>
        <p className="text-xs text-rose-700/80 mt-1">
          {kind === "reimbursement"
            ? "Perbaiki kwitansi di bawah (edit, hapus, atau tambah kwitansi) sesuai catatan penolakan, lalu ajukan ulang."
            : "Revisi RAB di atas sesuai catatan penolakan, lalu ajukan ulang."}
        </p>
      </div>
      {error && (
        <div className="text-sm text-rose-700 bg-white border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Catatan revisi untuk penyetuju (opsional)"
        className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
      />
      <button
        type="button"
        onClick={handleResubmit}
        disabled={loading}
        className="w-full flex items-center justify-center gap-1.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-medium rounded-lg py-2.5 lg:rounded-full lg:bg-dark-navy lg:font-semibold lg:hover:bg-slate-800"
      >
        <RotateCcw size={16} />
        {loading ? "Mengajukan..." : "Ajukan Ulang"}
      </button>
    </div>
  );
}
