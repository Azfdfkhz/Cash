import { Hourglass } from "lucide-react";

// Penanda: ada pengembalian sisa saldo yang menunggu konfirmasi operasional.
// `operational`: dilihat tim operasional (aksi ada di mereka) -> "Perlu konfirmasi".
export default function ReturnPendingBadge({ operational = false, className = "" }) {
  return (
    <span
      title={operational ? "Pengembalian sisa saldo perlu dikonfirmasi Operasional" : "Pengembalian sisa saldo menunggu konfirmasi Operasional"}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2 py-px text-xs font-semibold text-amber-700 ${className}`}
    >
      <Hourglass size={11} strokeWidth={2.25} />
      {operational ? "Perlu konfirmasi" : "Menunggu konfirmasi"}
    </span>
  );
}
