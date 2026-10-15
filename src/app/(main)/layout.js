import { Suspense } from "react";
import SidebarData from "./SidebarData";
import BottomNavData from "./BottomNavData";
import MobileTopBar from "@/components/MobileTopBar";

// Layout ini sengaja TIDAK async / TIDAK await getUserProfile() langsung --
// kalau iya, seluruh navigasi ke halaman mana pun di bawah (main) akan
// terblokir sampai fetch profile selesai. Fetch profile dipindah ke
// SidebarData / BottomNavData yang masing-masing dibungkus <Suspense>,
// jadi {children} (dan loading.js miliknya) bisa langsung stream duluan.
//
//  Mobile  (<lg): MobileTopBar (statis) + konten + BottomNav
//  Desktop (≥lg): Sidebar tetap 256px di kiri + konten digeser pl-64
export default function MainLayout({ children }) {
  return (
    <div className="flex-1 flex flex-col min-h-dvh bg-slate-50 lg:pl-64">
      <Suspense
        fallback={
          <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 border-r border-slate-200 bg-white" />
        }
      >
        <SidebarData />
      </Suspense>

      <MobileTopBar />

      <main className="flex-1 w-full max-w-2xl mx-auto px-5 pt-5 pb-6 lg:mx-0 lg:max-w-6xl lg:px-8 lg:pt-8 lg:pb-10">
        {children}
      </main>

      <Suspense fallback={null}>
        <BottomNavData />
      </Suspense>
    </div>
  );
}
