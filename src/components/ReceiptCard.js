import { ExternalLink } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ReceiptCard({ receipt }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 truncate">
          {receipt.vendor || "Kwitansi"}
        </p>
        <p className="text-xs text-slate-500">
          {formatDate(receipt.receipt_date || receipt.created_at)}
        </p>
        {receipt.notes && (
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {receipt.notes}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="font-semibold text-slate-900">
          {formatCurrency(receipt.amount)}
        </p>
        {receipt.drive_view_url && (
          <a
            href={receipt.drive_view_url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-brand inline-flex items-center gap-1 mt-1"
          >
            Lihat foto <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}
