import Link from "next/link";
import { Eye } from "lucide-react";
import {
  formatCaCode,
  formatCurrency,
  formatDate,
  hasPendingReturn,
  KIND_LABEL,
  requesterName,
} from "@/lib/utils";
import StatusBadge from "./StatusBadge";
import ReturnPendingBadge from "./ReturnPendingBadge";
import NextAction from "./NextAction";

// Tanpa `onClick`: tautan ke /cash-advances/<id> (membuka pop up di Beranda).
// Dengan `onClick`: tombol yang membuka pop up di halaman yang sedang dibuka.
//
// `compact` (halaman Persetujuan): jenis pengajuan sudah diwakili tab, dan
// status sudah diwakili tab Persetujuan/Pencairan, jadi label jenis, badge
// status, dan badge pengembalian disembunyikan -- hanya info penting yang
// tersisa. `detailLabel` menambah tombol "Lihat Detail" yang jelas di kartu.
export default function CashAdvanceCard({
  ca,
  showRequester = false,
  onClick,
  compact = false,
  detailLabel = null,
}) {
  const baseCls = "block w-full text-left bg-white rounded-xl border border-slate-200 p-4";
  const cls = `${baseCls} hover:border-brand transition-colors`;
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {!compact && (
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">
              {KIND_LABEL[ca.kind] ?? "Cash Advance"}
            </p>
          )}
          <p className="font-medium text-slate-900 truncate">{ca.purpose}</p>
          {showRequester && (
            <p className="text-xs font-medium text-slate-700 mt-0.5 truncate">
              {requesterName(ca.profiles)}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-0.5">
            {formatDate(ca.created_at)}
            {compact && <span className="font-num"> · {formatCaCode(ca)}</span>}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          {!compact && <StatusBadge status={ca.status} />}
          <NextAction ca={ca} operational={showRequester} />
          {!compact && hasPendingReturn(ca) && <ReturnPendingBadge operational={showRequester} />}
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="text-xs text-slate-500">Diajukan</p>
          <p className="font-semibold text-slate-900">
            {formatCurrency(ca.amount_requested)}
          </p>
        </div>
        {ca.status === "approved" && ca.kind !== "reimbursement" && (
          <div className="text-right">
            <p className="text-xs text-slate-500">Sisa Saldo</p>
            <p
              className={`font-semibold ${
                (ca.balance ?? ca.amount_requested) < 0
                  ? "text-rose-600"
                  : "text-emerald-600"
              }`}
            >
              {formatCurrency(ca.balance ?? ca.amount_requested)}
            </p>
          </div>
        )}
      </div>
    </>
  );

  // Kartu dengan tombol "Lihat Detail": kartunya sendiri bukan tombol (tombol
  // di dalam tombol tidak valid), hanya tombol di bawahnya yang bisa diketuk.
  if (onClick && detailLabel) {
    return (
      <div className={baseCls}>
        {content}
        <button
          type="button"
          onClick={onClick}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand bg-primary-muted px-4 text-sm font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
        >
          <Eye size={16} aria-hidden="true" />
          {detailLabel}
        </button>
      </div>
    );
  }

  return onClick ? (
    <button type="button" onClick={onClick} className={cls}>
      {content}
    </button>
  ) : (
    <Link href={`/cash-advances/${ca.id}`} className={cls}>
      {content}
    </Link>
  );
}
