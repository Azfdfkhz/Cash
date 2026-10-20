"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileClock, Trash2 } from "lucide-react";
import { clearDraft, DRAFT_EVENT, DRAFT_KINDS, getDraftInfo } from "@/lib/draft";
import { KIND_LABEL } from "@/lib/utils";

const HREF = {
  cash_advance: "/cash-advances/new",
  reimbursement: "/reimbursements/new",
};

function ago(iso) {
  if (!iso) return "";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  return `${Math.round(hrs / 24)} hari lalu`;
}

// Draft pengajuan yang belum terkirim (tersimpan otomatis di perangkat ini
// saat user keluar, terjadi error, atau jaringan putus) + tombol Lanjutkan.
export default function DraftReminder() {
  const [drafts, setDrafts] = useState([]);

  useEffect(() => {
    const read = () => setDrafts(DRAFT_KINDS.map(getDraftInfo).filter(Boolean));
    read();
    window.addEventListener(DRAFT_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(DRAFT_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  if (!drafts.length) return null;

  return (
    <div className="mb-4 space-y-2">
      {drafts.map((d) => (
        <div
          key={d.kind}
          className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-3.5"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <FileClock size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-amber-900">
              Draft {KIND_LABEL[d.kind]}
              {d.title ? ` · ${d.title}` : ""}
            </p>
            <p className="text-xs text-amber-800/80">
              {d.reason === "error" ? "Gagal terkirim, tersimpan otomatis" : "Belum dikirim"}
              {d.savedAt ? ` · ${ago(d.savedAt)}` : ""}
            </p>
          </div>
          <Link
            href={HREF[d.kind]}
            className="shrink-0 rounded-full bg-[#0f172a] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
          >
            Lanjutkan
          </Link>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Hapus draft ini? Isian yang tersimpan akan hilang.")) {
                clearDraft(d.kind);
              }
            }}
            aria-label="Hapus draft"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-amber-700 hover:bg-amber-100"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
