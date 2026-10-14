"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

export default function Header({ fullName, role }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200 safe-top">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-brand flex items-center justify-center shrink-0">
            <Logo className="text-white" size={18} />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">
              {fullName}
            </p>
            <p className="text-xs text-slate-500">
              {role === "operational" ? "Tim Operasional" : "Requester"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/profile"
            aria-label="Profil"
            className="h-9 w-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
          >
            <Settings size={18} />
          </Link>
          <button
            onClick={handleLogout}
            aria-label="Keluar"
            className="h-9 w-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
