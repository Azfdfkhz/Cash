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

// Jumlah pengajuan yang butuh tindakan tim operasional di halaman Persetujuan
// (menunggu persetujuan + disetujui tapi belum dicairkan), tidak termasuk
// pengajuan milik sendiri. Dipakai untuk titik oranye di menu Persetujuan --
// harus sama dengan isi daftar di halaman itu.
export const getApprovalBadgeCount = cache(async function getApprovalBadgeCount(userId) {
  if (!userId) return 0;
  const supabase = await createClient();
  const [pending, toDisburse] = await Promise.all([
    supabase
      .from("cash_advances")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .neq("requester_id", userId),
    supabase
      .from("cash_advances")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .is("disbursed_at", null)
      .neq("requester_id", userId),
  ]);
  return (pending.count ?? 0) + (toDisburse.count ?? 0);
});
