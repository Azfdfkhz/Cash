"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

// Error di halaman utama: tampilkan pesan + kode error (bukan layar error
// umum) supaya penyebabnya bisa dilaporkan & dilacak di log.
export default function Error({ error, retry }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-white rounded-2xl border border-rose-200 p-5 space-y-3">
      <div className="flex items-center gap-2 text-rose-700">
        <AlertTriangle size={20} />
        <p className="font-semibold">Halaman ini gagal dimuat</p>
      </div>
      <p className="text-sm text-slate-600">
        Coba muat ulang. Kalau masih gagal, kirimkan pesan di bawah ini ke tim
        yang mengelola aplikasi.
      </p>
      <pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-700">
        {error?.message || "Terjadi kesalahan."}
        {error?.digest ? `\nKode: ${error.digest}` : ""}
      </pre>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => retry()}
          className="flex-1 rounded-lg bg-brand hover:bg-brand-dark py-2.5 text-sm font-medium text-white"
        >
          Muat Ulang
        </button>
        <a
          href="/dashboard"
          className="flex-1 rounded-lg border border-slate-300 py-2.5 text-center text-sm font-medium text-slate-700"
        >
          Ke Beranda
        </a>
      </div>
    </div>
  );
}
