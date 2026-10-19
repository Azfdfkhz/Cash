"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import KindSwitch from "@/components/KindSwitch";

// Kerangka halaman "Pengajuan baru":
//  Mobile  : header (tombol kembali + judul), form, lalu ringkasan validasi;
//            tombol Draft / Kirim menempel di bawah (di dalam `summary`).
//  Desktop : form di kiri, ringkasan validasi sticky di kanan.
export default function RequestShell({ active, summary, children }) {
  const router = useRouter();
  return (
    <div className="pb-28 lg:pb-0">
      <header className="relative mb-4 flex h-11 items-center justify-center lg:hidden">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Kembali"
          className="absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-base font-bold text-slate-900">Pengajuan Baru</h1>
      </header>

      <div className="hidden lg:block">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Pengajuan baru</h1>
        <p className="mt-1 text-base text-slate-500">
          Isi semua kolom bertanda <span className="text-rose-500">*</span>. Ringkasan di samping
          diperbarui secara otomatis.
        </p>
      </div>

      <div className="mt-2 grid gap-5 lg:mt-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
        <div className="min-w-0 space-y-5">
          <KindSwitch active={active} />
          {children}
        </div>
        <aside className="lg:sticky lg:top-8">{summary}</aside>
      </div>
    </div>
  );
}
