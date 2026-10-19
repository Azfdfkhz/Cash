import { STATUS_LABEL, STATUS_STYLE } from "@/lib/utils";

export default function StatusBadge({ status, className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[status] ?? ""} ${className}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
