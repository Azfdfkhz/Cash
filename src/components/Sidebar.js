"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { LogOut } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import { useLogout } from "@/components/useLogout";
import { navFor, isActive } from "@/components/nav-items";
import { useApprovalBadge } from "@/components/useApprovalBadge";
import { useHasDraft } from "@/lib/useHasDraft";
import { shortName } from "@/lib/utils";
import ProfileAvatar from "@/components/ProfileAvatar";

const APPROVAL_SUBS = [
  { kind: "cash_advance", label: "Cash Advance" },
  { kind: "reimbursement", label: "Reimbursement" },
];

// Sidebar desktop 256px (≥lg). Di mobile tidak dirender (pakai BottomNav).
export default function Sidebar({ role, fullName, pendingCounts, userId }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const approvals = useApprovalBadge(pendingCounts, userId, role === "operational");
  const activeKind = searchParams.get("jenis") === "reimbursement" ? "reimbursement" : "cash_advance";
  const hasDraft = useHasDraft().any;
  const { requestLogout, dialog } = useLogout();
  const items = navFor(role);

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-6 pb-5 pt-7">
        <BrandMark size="sm" />
      </div>

      <nav className="flex-1 px-3 py-5">
        <ul className="space-y-1.5">
          {items.map(({ href, label, icon: Icon, badge, draft, also }) => {
            const active = isActive(pathname, href, also);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex items-center gap-3.5 rounded-xl px-4 py-3 text-[13px] transition-colors ${
                    active
                      ? "bg-blue-50 font-semibold text-blue-800 ring-1 ring-inset ring-blue-100"
                      : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon size={20} strokeWidth={1.75} className="shrink-0" />
                  <span>{label}</span>
                  {draft && hasDraft && (
                    <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                      Draft
                    </span>
                  )}
                  {/* Sub-menu tertutup: titik di menu induk menandakan ada yang perlu tindakan. */}
                  {badge && !active && approvals.total > 0 && (
                    <span
                      className="ml-auto h-2 w-2 rounded-full bg-orange-500"
                      aria-label={`${approvals.total} perlu tindakan`}
                    />
                  )}
                </Link>
                {badge && active && (
                  <ul className="mt-1 space-y-1 pl-[2.6rem]" aria-label="Jenis pengajuan">
                    {APPROVAL_SUBS.map((sub) => {
                      const subActive = active && activeKind === sub.kind;
                      const n = approvals[sub.kind] ?? 0;
                      return (
                        <li key={sub.kind}>
                          <Link
                            href={`/approvals?jenis=${sub.kind}`}
                            aria-current={subActive ? "page" : undefined}
                            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                              subActive
                                ? "bg-slate-100 font-semibold text-slate-900"
                                : "font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            <span>{sub.label}</span>
                            {n > 0 && (
                              <span
                                className="ml-auto h-2 w-2 rounded-full bg-orange-500"
                                aria-label={`${n} pengajuan ${sub.label} perlu tindakan`}
                              />
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="flex items-center gap-3 border-t border-slate-100 px-4 py-4">
        <ProfileAvatar size={36} />
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
