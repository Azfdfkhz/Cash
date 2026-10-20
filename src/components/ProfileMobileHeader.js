"use client";

import { Camera } from "lucide-react";
import ProfileAvatar from "@/components/ProfileAvatar";
import { maskEmail } from "@/lib/utils";

// Header profil khusus mobile (<lg): judul, avatar, nama, email dan badge
// peran — sesuai desain Figma.
export default function ProfileMobileHeader({ fullName, email, role }) {
  return (
    <div className="lg:hidden">
      <h1 className="pt-3 text-2xl font-bold text-slate-900">Profil</h1>

      <div className="mt-6 flex flex-col items-center text-center">
        <div className="relative h-[84px] w-[84px]">
          <ProfileAvatar size={84} />
          <span
            aria-hidden="true"
            className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border border-slate-100 bg-white text-slate-700 shadow-sm"
          >
            <Camera size={14} strokeWidth={2} />
          </span>
        </div>

        <p className="mt-4 text-lg font-bold text-slate-900">{fullName}</p>
        <p className="mt-0.5 break-all text-sm text-slate-500">{maskEmail(email)}</p>
        <span className="mt-3 inline-block rounded-full bg-slate-100 px-4 py-1 text-xs font-semibold text-slate-700">
          {role === "operational" ? "Operasional" : "Requester"}
        </span>
      </div>
    </div>
  );
}
