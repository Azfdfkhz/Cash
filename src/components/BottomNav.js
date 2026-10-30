"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navFor, isActive } from "@/components/nav-items";
import { useApprovalBadge } from "@/components/useApprovalBadge";
import { useHasDraft } from "@/lib/useHasDraft";

// Navigasi bawah mobile (disembunyikan ≥lg, diganti Sidebar).
// Item aktif: garis gelap 3px di tepi atas + ikon/label gelap.
// Nav menempel `fixed` di dasar layar (bukan sticky di dalam kontainer min-h-dvh):
// tinggi dvh berubah saat bilah alamat browser mobile muncul/hilang ketika
// scroll, dan itu membuat nav sticky terangkat beberapa px. Spacer di alur
// halaman menyisakan ruang setinggi nav supaya konten tidak tertutup.
const NAV_CLASS =
  "lg:hidden fixed inset-x-0 bottom-0 z-20 transform-gpu border-t border-slate-200 bg-white safe-bottom";

// Kerangka nav selagi data peran dimuat: tinggi sama persis dengan nav asli
// supaya tidak ada loncatan saat diganti.
export function BottomNavShell() {
  return (
    <>
      <div aria-hidden="true" className="bottom-nav-spacer lg:hidden" />
      <nav aria-hidden="true" className={NAV_CLASS}>
        <ul className="flex animate-pulse px-4 pt-2 pb-3">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="flex-1">
              <div className="flex flex-col items-center gap-1 px-2 py-1.5">
                <div className="h-5 w-5 rounded bg-slate-200" />
                <div className="h-4 w-10 rounded bg-slate-100" />
              </div>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

export default function BottomNav({ role, pendingCounts, userId }) {
  const pathname = usePathname();
  const approvalCount = useApprovalBadge(pendingCounts, userId, role === "operational").total;
  const hasDraft = useHasDraft().any;
  const items = navFor(role);

  return (
    <>
    <div aria-hidden="true" className="bottom-nav-spacer lg:hidden" />
    <nav data-tour="nav" className={NAV_CLASS}>
      <ul className="flex px-4 pt-2 pb-3">
        {items.map(({ href, label, icon: Icon, badge, draft, also, tour }) => {
          const active = isActive(pathname, href, also);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                data-tour={tour}
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
                    className={active ? "text-[#0f172a]" : "text-slate-600"}
                  />
                  {draft && hasDraft && (
                    <span
                      className="absolute -right-1.5 -top-0.5 h-2 w-2 rounded-full bg-amber-500"
                      aria-label="Ada draft pengajuan"
                    />
                  )}
                  {badge && approvalCount > 0 && (
                    <span className="absolute -right-1.5 -top-0.5 h-2 w-2 rounded-full bg-orange-500" />
                  )}
                </span>
                <span
                  className={`text-xs font-semibold ${
                    active ? "text-[#0f172a]" : "text-slate-600"
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
    </>
  );
}
