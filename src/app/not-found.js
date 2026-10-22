import Link from "next/link";

export const metadata = { title: "Halaman tidak ditemukan" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold text-slate-900">Halaman tidak ditemukan</h1>
      <p className="max-w-prose text-sm text-slate-600">
        Alamat yang Anda buka tidak ada atau sudah dipindahkan.
      </p>
      <Link
        href="/dashboard"
        className="rounded-full bg-[#0f172a] px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Ke Beranda
      </Link>
    </main>
  );
}
