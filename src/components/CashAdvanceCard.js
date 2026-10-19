import Link from "next/link";
import { formatCurrency, formatDate, KIND_LABEL } from "@/lib/utils";
import StatusBadge from "./StatusBadge";

export default function CashAdvanceCard({ ca, showRequester = false }) {
  return (
    <Link
      href={`/cash-advances/${ca.id}`}
      className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-brand transition-colors"
    >
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
          <p className="text-xs text-slate-400 mt-0.5">
            {formatDate(ca.created_at)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusBadge status={ca.status} />
          {ca.status === "approved" && !ca.disbursed_at && (
            <span className="text-[11px] font-medium text-amber-700">
              {ca.kind === "reimbursement" ? "Belum ditransfer" : "Belum dicairkan"}
            </span>
          )}
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
    </Link>
  );
}
