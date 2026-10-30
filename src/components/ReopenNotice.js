import { RotateCcw } from "lucide-react";
import { formatDateTimeFull } from "@/lib/utils";

// Banner "dibuka kembali untuk tinjau ulang". Tampil selama pengajuan belum
// ditutup lagi (reopened_at dikosongkan saat status kembali closed), supaya
// pemohon tahu APA yang harus diperbaiki dan Ops tahu sedang menunggu siapa.
export function isReopened(ca) {
  return Boolean(ca?.reopened_at) && ca?.status === "approved";
}

// Langkah yang harus dilakukan pemohon. Setelah dibuka kembali, pengembalian
// yang tadinya terkonfirmasi kembali "menunggu konfirmasi", dan selama itu
// kwitansi terkunci -- jadi urutannya bergantung pada ada/tidaknya pengembalian.
function ownerSteps(pendingReturn) {
  return [
    ...(pendingReturn
      ? [
          <>
            Di tab <b>Ringkasan</b>, bagian Pengembalian: klik <b>Batalkan</b> pada pengembalian yang
            masih menunggu konfirmasi.
          </>,
        ]
      : []),
    <>
      Buka tab <b>Kwitansi</b>, lalu <b>edit</b> atau <b>hapus</b> kwitansi yang salah. Tambah yang
      kurang lewat <b>Scan Kwitansi</b>.
    </>,
    <>
      Jika masih ada sisa saldo, klik <b>Kembalikan sisa</b> dan unggah bukti transfer yang benar.
    </>,
  ];
}

export default function ReopenNotice({ ca, isOwner = false, pendingReturn = false, onFix }) {
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
      {isOwner ? (
        <>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-amber-800">
            Yang perlu Anda lakukan
          </p>
          <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-amber-950">
            {ownerSteps(pendingReturn).map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
          <p className="mt-2 text-xs leading-relaxed text-amber-900">
            Setelah data benar, Tim Operasional akan menutup pengajuan ini lagi.
          </p>
          {onFix && (
            <button
              type="button"
              onClick={onFix}
              className="mt-3 flex w-full items-center justify-center rounded-full bg-[#0f172a] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-800"
            >
              {pendingReturn ? "Buka Pengembalian" : "Buka Kwitansi"}
            </button>
          )}
        </>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-amber-900">
          Menunggu pemohon memperbaiki data. Tutup ulang pengajuan setelah semuanya benar.
        </p>
      )}
      <p className="mt-1 text-xs text-amber-800">{formatDateTimeFull(ca.reopened_at)}</p>
    </div>
  );
}
