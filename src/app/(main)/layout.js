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
    <div className="flex min-h-dvh flex-1 flex-col bg-[#f7f8fa] lg:pl-64">
      <Suspense
        fallback={
          <aside className="hidden lg:block fixed inset-y-0 left-0 w-64 border-r border-slate-200 bg-white" />
        }
      >
        <SidebarData />
      </Suspense>

      <MobileTopBar />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-8 pt-5 sm:px-6 lg:mx-0 lg:max-w-[1440px] lg:px-9 lg:pb-12 lg:pt-9 2xl:px-12">
        {children}
      </main>

      <Suspense fallback={null}>
        <BottomNavData />
      </Suspense>
    </div>
  );
}
