"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PlusCircle, ClipboardCheck, Table2 } from "lucide-react";

const REQUESTER_ITEMS = [
  { href: "/dashboard", label: "Beranda", icon: LayoutDashboard },
  { href: "/cash-advances/new", label: "Ajukan", icon: PlusCircle },
];

const OPERATIONAL_ITEMS = [
  { href: "/dashboard", label: "Beranda", icon: LayoutDashboard },
  { href: "/approvals", label: "Persetujuan", icon: ClipboardCheck },
  { href: "/cash-advances/new", label: "Ajukan", icon: PlusCircle },
  { href: "/reports", label: "Laporan", icon: Table2 },
];

export default function BottomNav({ role }) {
  const pathname = usePathname();
  const items = role === "operational" ? OPERATIONAL_ITEMS : REQUESTER_ITEMS;

  return (
    <nav className="sticky bottom-0 z-20 bg-white/95 backdrop-blur border-t border-slate-200 safe-bottom">
      <ul className="flex justify-around px-2 pt-1.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className="group flex flex-col items-center gap-1 py-1 text-xs transition-colors"
              >
                <span
                  className={`flex items-center justify-center h-9 w-14 rounded-full transition-colors ${
                    active
                      ? "bg-brand/10 text-brand"
                      : "text-slate-400 group-hover:text-slate-600"
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                </span>
                <span
                  className={
                    active
                      ? "font-semibold text-brand"
                      : "font-medium text-slate-500"
                  }
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
