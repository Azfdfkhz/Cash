import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import HelpCenter from "@/components/help/HelpCenter";
import { getHelpContent } from "@/lib/helpContent";

export const metadata = { title: "Pusat bantuan" };

// Versi publik Pusat Bantuan (bisa dibuka dari halaman masuk sebelum login).
// Isinya hanya panduan requester (tanpa panduan Tim Operasional); tidak memuat data akun atau pengajuan apa pun.
export default function PublicHelpPage() {
  return (
    <div className="min-h-dvh bg-[#f7f8fa]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <BrandMark size="sm" />
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
          >
            <ArrowLeft size={15} aria-hidden="true" />
            Masuk
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <HelpCenter content={getHelpContent()} />
      </main>
    </div>
  );
}
