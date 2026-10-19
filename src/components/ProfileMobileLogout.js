"use client";

import { LogOut } from "lucide-react";
import { useLogout } from "@/components/useLogout";

export default function ProfileMobileLogout() {
  const { requestLogout, dialog } = useLogout();
  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={requestLogout}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 text-base font-semibold text-rose-600 transition-colors hover:bg-rose-50"
      >
        <LogOut size={20} strokeWidth={1.75} />
        Keluar
      </button>
      {dialog}
    </div>
  );
}
