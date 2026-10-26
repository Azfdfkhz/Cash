import { RotateCcw } from "lucide-react";
import { formatDateTimeFull } from "@/lib/utils";

// Banner "dibuka kembali untuk tinjau ulang". Tampil selama pengajuan belum
// ditutup lagi (reopened_at dikosongkan saat status kembali closed), supaya
// pemohon tahu APA yang harus diperbaiki dan Ops tahu sedang menunggu siapa.
export function isReopened(ca) {
  return Boolean(ca?.reopened_at) && ca?.status === "approved";
}

export default function ReopenNotice({ ca, isOwner = false }) {
  if (!isReopened(ca)) return null;
  return (
    <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
      <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
        <RotateCcw size={14} className="shrink-0" />
        Dibuka kembali untuk tinjau ulang
      </p>
      {ca.reopen_note && (
        <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
          Catatan Tim Operasional
        </p>
      )}
      {ca.reopen_note && (
        <p className="mt-0.5 whitespace-pre-line text-sm leading-relaxed text-amber-950">
          {ca.reopen_note}
        </p>
      )}
      <p className="mt-2 text-xs leading-relaxed text-amber-900">
        {isOwner
          ? "Perbaiki kwitansi atau bukti pengembalian yang salah. Tim Operasional akan menutup pengajuan ini lagi setelah data benar."
          : "Menunggu pemohon memperbaiki data. Tutup ulang pengajuan setelah semuanya benar."}
      </p>
      <p className="mt-1 text-xs text-amber-800">{formatDateTimeFull(ca.reopened_at)}</p>
    </div>
  );
}
