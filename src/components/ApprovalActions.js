"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ApprovalActions({ cashAdvanceId }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function decide(status) {
    setError("");
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

    router.refresh();
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
