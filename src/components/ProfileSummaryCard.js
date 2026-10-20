"use client";

import { Camera, LogOut } from "lucide-react";
import { useLogout } from "@/components/useLogout";
import ProfileAvatar from "@/components/ProfileAvatar";
import { maskEmail } from "@/lib/utils";

// Kartu ringkasan profil — hanya tampil di desktop (≥lg), sesuai desain Figma.
export default function ProfileSummaryCard({ fullName, email, role }) {
  const { requestLogout, dialog } = useLogout();

  return (
    <div className="hidden lg:block rounded-3xl border border-slate-200 bg-white p-6 text-center">
      <div className="relative mx-auto h-24 w-24">
        <ProfileAvatar size={96} />
        <span
          aria-hidden="true"
          className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-600 shadow-sm"
        >
          <Camera size={14} strokeWidth={1.75} />
        </span>
      </div>
      <p className="mt-5 text-lg font-bold text-slate-900">{fullName}</p>
      <p className="mt-1 break-all text-xs text-slate-500">{maskEmail(email)}</p>
      <span className="mt-3 inline-block rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
        {role === "operational" ? "Operasional" : "Requester"}
      </span>

      <div className="mt-6 border-t border-slate-100 pt-6">
        <button
          type="button"
          onClick={requestLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
        >
          <LogOut size={16} strokeWidth={2} />
          Keluar
        </button>
      </div>
      {dialog}
    </div>
  );
}
