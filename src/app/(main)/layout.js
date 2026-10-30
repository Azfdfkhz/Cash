import { Suspense } from "react";
import SidebarData from "./SidebarData";
import BottomNavData from "./BottomNavData";
import OnboardingData from "./OnboardingData";
import MobileTopBar from "@/components/MobileTopBar";
import BrandMark from "@/components/BrandMark";
import { BottomNavShell } from "@/components/BottomNav";

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
          <aside
            aria-hidden="true"
            className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-64 flex-col border-r border-slate-200 bg-white"
          >
            <div className="border-b border-slate-100 px-6 pb-5 pt-7">
              <BrandMark size="sm" />
            </div>
            <div className="flex-1 animate-pulse space-y-1.5 px-3 py-5">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-3.5 rounded-xl px-4 py-3">
                  <div className="h-5 w-5 rounded bg-slate-200" />
                  <div className="h-3.5 w-24 rounded bg-slate-100" />
                </div>
              ))}
            </div>
          </aside>
        }
      >
        <SidebarData />
      </Suspense>

      <MobileTopBar />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-8 pt-5 sm:px-6 lg:mx-0 lg:max-w-[1440px] lg:px-9 lg:pb-12 lg:pt-9 2xl:px-12">
        {children}
      </main>

      <Suspense
        fallback={<BottomNavShell />}
      >
        <BottomNavData />
      </Suspense>

      <Suspense fallback={null}>
        <OnboardingData />
      </Suspense>
    </div>
  );
}
