"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Keluar dengan pop up konfirmasi (dari versi fitur). Pemakaian:
//   const { requestLogout, dialog } = useLogout();
//   <button onClick={requestLogout}>…</button>  +  {dialog}
export function useLogout() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Tutup pop up dengan tombol Esc.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !loggingOut) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loggingOut]);

  async function logout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const dialog = open ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={() => !loggingOut && setOpen(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
            <LogOut size={18} />
          </div>
          <div>
            <h2 id="logout-title" className="font-semibold text-slate-900">
              Keluar dari akun?
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Anda perlu masuk lagi untuk menggunakan aplikasi.
            </p>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => setOpen(false)}
            disabled={loggingOut}
            className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={logout}
            disabled={loggingOut}
            className="flex-1 rounded-lg bg-rose-600 hover:bg-rose-700 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {loggingOut ? "Keluar..." : "Ya, Keluar"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { requestLogout: () => setOpen(true), dialog };
}
