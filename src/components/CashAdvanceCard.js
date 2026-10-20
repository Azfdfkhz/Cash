import Link from "next/link";
import { formatCurrency, formatDate, hasPendingReturn, KIND_LABEL } from "@/lib/utils";
import StatusBadge from "./StatusBadge";
import ReturnPendingBadge from "./ReturnPendingBadge";
import NextAction from "./NextAction";

// Tanpa `onClick`: tautan ke /cash-advances/<id> (membuka pop up di Beranda).
// Dengan `onClick`: tombol yang membuka pop up di halaman yang sedang dibuka.
export default function CashAdvanceCard({ ca, showRequester = false, onClick }) {
  const cls =
    "block w-full text-left bg-white rounded-xl border border-slate-200 p-4 hover:border-brand transition-colors";
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-brand">
            {KIND_LABEL[ca.kind] ?? "Cash Advance"}
          </p>
          <p className="font-medium text-slate-900 truncate">{ca.purpose}</p>
          {showRequester && (
            <p className="text-xs text-slate-500 mt-0.5">
              {ca.profiles?.full_name}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-0.5">
            {formatDate(ca.created_at)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusBadge status={ca.status} />
          <NextAction ca={ca} operational={showRequester} />
          {hasPendingReturn(ca) && <ReturnPendingBadge operational={showRequester} />}
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
