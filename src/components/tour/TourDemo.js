"use client";

import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import CashAdvanceReviewModal from "@/components/CashAdvanceReviewModal";
import { DEMO_OPS_ID, demoRequests } from "@/lib/tour/demoData";

// Tampilan CONTOH untuk tur. Yang ditampilkan adalah komponen ASLI aplikasi
// (CashAdvanceReviewModal + CashAdvanceDetailPopup), jadi bentuknya sama persis
// dengan desain. Datanya statis dari lib/tour/demoData.js: komponen itu
// mengenali pengajuan contoh lewat isDemoCa(), tidak memuat apa pun dari
// Supabase, dan tombol keputusan/simpan tidak pernah menulis ke database.
//
// Pembungkus `data-tour-demo` memberi tahu ProductTour bahwa pop up di dalamnya
// milik tur (bukan pop up aplikasi), supaya tur tidak menjeda dirinya.

const noop = () => {};

function Bar({ className = "" }) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

// Panel tinjau (laci kanan) dan, bila `detail`, pop up detail lengkap di
// sebelah kirinya. Pop up detail menampilkan skeleton aslinya selagi isinya
// "dimuat".
function DemoReview({ role, detail }) {
  const operational = role === "operational";
  const ca = useMemo(() => demoRequests(role)[0], [role]);
  return (
    <div data-tour-demo>
      <CashAdvanceReviewModal
        isOpen
        ca={ca}
        onClose={noop}
        onPrev={noop}
        onNext={noop}
        hasPrev={false}
        hasNext={false}
        currentUserId={operational ? DEMO_OPS_ID : ca.requester_id}
        canReview={operational}
        startWithDetail={detail}
      />
    </div>
  );
}

export default function TourDemo({ kind, role, detail = false }) {
  if (kind === "review") return <DemoReview role={role} detail={detail} />;
  return null;
}

// Kartu "sedang memindahkan halaman": muncul saat tur menunggu halaman/elemen
// berikutnya siap, supaya pengguna tahu ada proses berjalan (bukan macet).
export function TourLoading({ title, hint, onStop }) {
  return (
    <div data-tour-ui>
      <div aria-hidden="true" className="fixed inset-0 z-[80] bg-slate-900/40" />
      <div
        role="status"
        aria-live="polite"
        style={{ animationDelay: "150ms", animationFillMode: "both" }}
        className="animate-fade-in fixed left-1/2 top-1/2 z-[90] w-[min(22rem,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-200"
      >
        <div className="flex items-center gap-3">
          <Loader2 size={20} className="shrink-0 animate-spin text-brand" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900">{title}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{hint}</p>
          </div>
        </div>
        <div aria-hidden="true" className="mt-4 space-y-2">
          <Bar className="h-3 w-3/4" />
          <Bar className="h-3 w-full" />
          <Bar className="h-3 w-1/2" />
        </div>
        <div className="mt-4 text-right">
          <button
            type="button"
            onClick={onStop}
            className="text-xs font-semibold text-slate-600 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Hentikan tur
          </button>
        </div>
      </div>
    </div>
  );
}
