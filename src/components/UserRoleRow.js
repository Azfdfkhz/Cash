"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UserRoleRow({ user, currentUserId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isSelf = user.id === currentUserId;
  const isOperational = user.role === "operational";

  async function toggleRole() {
    setError("");
    setLoading(true);
    const supabase = createClient();
    const { error: rpcError } = await supabase.rpc("set_user_role", {
      target_id: user.id,
      new_role: isOperational ? "requester" : "operational",
    });
    setLoading(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    router.refresh();
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-medium text-slate-900 truncate">
          {user.full_name}
        </p>
        <p className="text-xs text-slate-500 truncate">{user.email}</p>
        {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            isOperational
              ? "bg-emerald-50 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          {isOperational ? "Tim Operasional" : "Requester"}
        </span>
        <button
          type="button"
          onClick={toggleRole}
          disabled={loading || isSelf}
          title={isSelf ? "Tidak bisa mengubah role sendiri" : undefined}
          className="text-xs font-medium text-brand disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading
            ? "..."
            : isOperational
              ? "Jadikan Requester"
              : "Jadikan Operasional"}
        </button>
      </div>
    </div>
  );
}
