import { formatCompactIdr, formatCurrency } from "@/lib/utils";

// Nominal ringkas untuk tampilan + nominal penuh untuk tooltip (title) dan
// pembaca layar (sr-only). Hanya mengubah cara tampil; nilai tidak berubah.
// Angka di bawah 1 juta sudah tampil penuh, jadi tidak diberi tambahan.
export default function CompactIdr({ value, prefix = true, long = false, className = "" }) {
  const full = formatCurrency(value);
  const short = formatCompactIdr(value, { prefix, long });
  const isCompact = short !== full;
  return (
    <span title={isCompact ? full : undefined} className={className}>
      <span aria-hidden={isCompact ? "true" : undefined}>{short}</span>
      {isCompact && <span className="sr-only">{full}</span>}
    </span>
  );
}
