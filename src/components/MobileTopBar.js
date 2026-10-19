"use client";

import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { useLogout } from "@/components/useLogout";

// Top bar mobile (disembunyikan di desktop, di mana sidebar yang dipakai).
export default function MobileTopBar() {
  const { requestLogout, dialog } = useLogout();
  const pathname = usePathname();
  // Halaman Pengajuan baru punya header sendiri (tombol kembali + judul).
  if (/^\/(cash-advances|reimbursements)\/new/.test(pathname)) return null;
  return (
    <header className="lg:hidden flex items-center justify-between px-5 pt-8 pb-1 safe-top">
      <BrandMark size="lg" />
      <button
        type="button"
        onClick={requestLogout}
        aria-label="Keluar"
        className="h-11 w-11 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <LogOut size={18} strokeWidth={1.75} />
      </button>
      {dialog}
    </header>
  );
}
