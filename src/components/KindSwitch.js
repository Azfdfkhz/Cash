"use client";

import Link from "next/link";
import { Briefcase, ReceiptText } from "lucide-react";
import { useHasDraft } from "@/lib/useHasDraft";

// Pilihan jenis pengajuan di atas form "Ajukan" (kartu + radio, sesuai Figma).
export default function KindSwitch({ active }) {
  const drafts = useHasDraft();
  const items = [
    { kind: "cash_advance", href: "/cash-advances/new", label: "Cash Advance", hint: "Minta dana sebelum belanja", icon: Briefcase },
    { kind: "reimbursement", href: "/reimbursements/new", label: "Reimbursement", hint: "Klaim uang pribadi yang sudah terpakai", icon: ReceiptText },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:gap-5" role="radiogroup" aria-label="Jenis pengajuan">
      {items.map(({ kind, href, label, hint, icon: Icon }) => {
        const selected = active === kind;
        return (
          <Link
            key={kind}
            href={href}
            replace
            role="radio"
            aria-checked={selected}
            className={`relative flex flex-col gap-2 rounded-2xl bg-white p-4 transition-colors lg:flex-row lg:items-center lg:gap-4 lg:rounded-3xl lg:px-5 lg:py-5 ${
              selected
                ? "border-2 border-[#0f172a]"
                : "border border-slate-200 opacity-60 hover:opacity-90"
            }`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-600 lg:h-12 lg:w-12 lg:bg-slate-50">
              <Icon size={22} strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1 pr-7 lg:pr-9">
              <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900 lg:text-base">
                {label}
                {drafts[kind] && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-px text-[10px] font-bold text-amber-700">
                    Draft
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-slate-500 lg:text-sm">{hint}</span>
            </span>
            <span
              aria-hidden="true"
              className={`absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 lg:top-1/2 lg:-translate-y-1/2 ${
                selected ? "border-[#0f172a]" : "border-slate-300"
              }`}
            >
              {selected && <span className="h-3 w-3 rounded-full bg-[#0f172a]" />}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
