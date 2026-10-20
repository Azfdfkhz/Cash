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
export const EMPTY_APPROVAL_COUNTS = { total: 0, cash_advance: 0, reimbursement: 0 };

// Hasil: { total, cash_advance, reimbursement } -- per jenis dipakai untuk titik
// notifikasi di sub-menu Persetujuan (Cash Advance / Reimbursement).
export const getApprovalBadgeCount = cache(async function getApprovalBadgeCount(userId) {
  if (!userId) return EMPTY_APPROVAL_COUNTS;
  const supabase = await createClient();
  const count = (kind, toDisburse) => {
    let q = supabase
      .from("cash_advances")
      .select("id", { count: "exact", head: true })
      .eq("kind", kind)
      .neq("requester_id", userId);
    q = toDisburse ? q.eq("status", "approved").is("disbursed_at", null) : q.eq("status", "pending");
    return q;
  };
  const [caP, caD, reP, reD] = await Promise.all([
    count("cash_advance", false),
    count("cash_advance", true),
    count("reimbursement", false),
    count("reimbursement", true),
  ]);
  const cash_advance = (caP.count ?? 0) + (caD.count ?? 0);
  const reimbursement = (reP.count ?? 0) + (reD.count ?? 0);
  return { total: cash_advance + reimbursement, cash_advance, reimbursement };
});
