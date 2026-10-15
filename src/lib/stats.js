import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Dipakai bersama oleh Sidebar, BottomNav, dan halaman Beranda --
// React.cache membuat satu request server hanya menjalankan RPC sekali.
// Kolom baru (active_count, dst.) bernilai 0 bila migrasi 0015 belum dijalankan.
export const getDashboardStats = cache(async function getDashboardStats() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("cash_advance_dashboard_stats").single();
  return {
    pendingCount: Number(data?.pending_count ?? 0),
    totalOutstanding: Number(data?.total_outstanding ?? 0),
    activeCount: Number(data?.active_count ?? 0),
    totalReturned: Number(data?.total_returned ?? 0),
    needsSpjCount: Number(data?.needs_spj_count ?? 0),
  };
});
