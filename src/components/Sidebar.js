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
  const logout = useLogout();
  const items = navFor(role);

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-slate-200 bg-white">
      <div className="px-4 pt-8 pb-5 border-b border-slate-200">
        <BrandMark size="sm" />
      </div>

      <nav className="flex-1 px-3.5 py-4">
        <ul className="space-y-1.5">
          {items.map(({ href, label, icon: Icon, badge }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-4 rounded-2xl px-4 py-3 text-xs transition-colors ${
                    active
                      ? "bg-slate-200/80 font-semibold text-slate-900 shadow-[0_2px_6px_rgba(15,23,42,0.12)]"
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
        <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">
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
          onClick={logout}
          aria-label="Keluar"
          title="Keluar"
          className="h-10 w-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <LogOut size={17} strokeWidth={1.75} />
        </button>
      </div>
    </aside>
  );
}
