"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { useLogout } from "@/components/useLogout";
import { navFor, isActive } from "@/components/nav-items";
import { getInitials, shortName } from "@/lib/utils";

// Sidebar desktop 256px (≥lg). Di mobile tidak dirender (pakai BottomNav).
export default function Sidebar({ role, fullName, pendingCount = 0 }) {
  const pathname = usePathname();
  const { requestLogout, dialog } = useLogout();
  const items = navFor(role);

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-slate-200 bg-white">
      <div className="px-7 pt-8 pb-5 border-b border-slate-200">
        <BrandMark size="sm" />
      </div>

      <nav className="flex-1 px-3.5 py-4">
        <ul className="space-y-1.5">
          {items.map(({ href, label, icon: Icon, badge, also }) => {
            const active = isActive(pathname, href, also);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-4 rounded-xl px-4 py-3 text-xs transition-colors ${
                    active
                      ? "bg-[#e5e5e5] font-semibold text-[#0f172a] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.2),0_2px_4px_-2px_rgba(0,0,0,0.2)]"
                      : "font-medium text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={20} strokeWidth={1.75} className="shrink-0" />
                  <span>{label}</span>
                  {badge && pendingCount > 0 && (
                    <span
                      className="h-2 w-2 rounded-full bg-orange-500"
                      aria-label={`${pendingCount} menunggu`}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-3 border-t border-slate-200 px-5 py-5">
        <div className="h-9 w-9 shrink-0 rounded-full border border-slate-300 bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
          {getInitials(fullName)}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-semibold text-slate-900">
            {shortName(fullName)}
          </p>
          <p className="truncate text-xs text-slate-500">
            {role === "operational" ? "Operasional" : "Requester"}
          </p>
        </div>
        <button
          type="button"
          onClick={requestLogout}
          aria-label="Keluar"
          title="Keluar"
          className="h-9 w-9 shrink-0 rounded-full border border-[#eceef2] bg-[#4e7086] flex items-center justify-center text-white shadow-[0_1px_1.5px_rgba(0,0,0,0.05)] hover:bg-[#3f5a6e] transition-colors"
        >
          <LogOut size={17} strokeWidth={1.75} />
        </button>
      </div>
      {dialog}
    </aside>
  );
}
