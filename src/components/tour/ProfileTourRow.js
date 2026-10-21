"use client";

import { ChevronRight, PlayCircle } from "lucide-react";
import { START_TOUR_EVENT } from "@/lib/tour/tourConfig";

// Baris menu "Panduan interaktif" di Profil > Lainnya: menjalankan ulang tur.
// Tampilannya sama dengan MenuRow di halaman Profil.
export default function ProfileTourRow() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(START_TOUR_EVENT))}
      className="flex w-full items-center gap-4 border-t border-slate-100 px-4 py-3.5 text-left first:border-t-0 hover:bg-slate-50"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-600">
        <PlayCircle size={20} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-slate-900">Panduan interaktif</span>
        <span className="block text-sm text-slate-500">Mulai tur ulang langsung di aplikasi</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-slate-400" />
    </button>
  );
}
