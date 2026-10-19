"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navFor, isActive } from "@/components/nav-items";

// Navigasi bawah mobile (disembunyikan ≥lg, diganti Sidebar).
// Item aktif: garis gelap 3px di tepi atas + ikon/label gelap.
export default function BottomNav({ role, pendingCount = 0 }) {
  const pathname = usePathname();
  const items = navFor(role);

  return (
    <nav className="lg:hidden sticky bottom-0 z-20 border-t border-slate-200 bg-white safe-bottom">
      <ul className="flex px-4 pt-2 pb-3">
        {items.map(({ href, label, icon: Icon, badge, also }) => {
          const active = isActive(pathname, href, also);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="relative flex flex-col items-center gap-1 px-2 py-1.5"
              >
                {active && (
                  <span className="absolute -top-2 left-1/2 h-[3px] w-6 -translate-x-1/2 rounded-b-[4px] bg-[#0f172a]" />
                )}
                <span className="relative">
                  <Icon
                    size={20}
                    strokeWidth={1.75}
                    className={active ? "text-[#0f172a]" : "text-slate-500"}
                  />
                  {badge && pendingCount > 0 && (
                    <span className="absolute -right-1.5 -top-0.5 h-2 w-2 rounded-full bg-orange-500" />
                  )}
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    active ? "text-[#0f172a]" : "text-slate-500"
                  }`}
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
