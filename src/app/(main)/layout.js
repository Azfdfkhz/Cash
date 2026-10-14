import { Suspense } from "react";
import HeaderData from "./HeaderData";
import BottomNavData from "./BottomNavData";

// Skeleton ukuran sama dengan <Header> supaya tidak ada layout shift saat
// data profile masih di-fetch.
function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200 safe-top">
      <div className="flex items-center px-4 py-3 h-13" />
    </header>
  );
}

// Layout ini sengaja TIDAK async / TIDAK await getUserProfile() langsung --
// kalau iya, seluruh navigasi ke halaman mana pun di bawah (main) akan
// terblokir sampai fetch profile selesai, walau tiap halaman sudah punya
// loading.js sendiri (lihat catatan "Working with runtime APIs" di dokumen
// Next.js bundled: layout yang akses data runtime tanpa Suspense sendiri
// tetap memblokir navigasi). Fetch profile dipindah ke HeaderData /
// BottomNavData yang masing-masing dibungkus <Suspense>, jadi {children}
// (dan loading.js miliknya) bisa langsung mulai render/stream duluan.
export default function MainLayout({ children }) {
  return (
    <div className="flex-1 flex flex-col min-h-screen">
      <Suspense fallback={<HeaderSkeleton />}>
        <HeaderData />
      </Suspense>
      <main className="flex-1 px-4 py-4 max-w-2xl w-full mx-auto">
        {children}
      </main>
      <Suspense fallback={null}>
        <BottomNavData />
      </Suspense>
    </div>
  );
}
