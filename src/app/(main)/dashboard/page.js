import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { createClient, getUserProfile } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { getPage, pageRange, PAGE_SIZE } from "@/lib/pagination";
import CashAdvanceCard from "@/components/CashAdvanceCard";
import Pagination from "@/components/Pagination";

export const dynamic = "force-dynamic";

async function attachBalances(supabase, cashAdvances) {
  if (!cashAdvances.length) return [];
  const ids = cashAdvances.map((ca) => ca.id);
  const { data: balances } = await supabase
    .from("cash_advance_balances")
    .select("cash_advance_id, balance")
    .in("cash_advance_id", ids);

  const balanceMap = new Map(
    (balances ?? []).map((b) => [b.cash_advance_id, b.balance])
  );

  return cashAdvances.map((ca) => ({
    ...ca,
    balance: balanceMap.has(ca.id) ? balanceMap.get(ca.id) : ca.amount_requested,
  }));
}

export default async function DashboardPage({ searchParams }) {
  const page = getPage(await searchParams);
  const { from, to } = pageRange(page);
  const { profile } = await getUserProfile();
  const supabase = await createClient();
  const isOperational = profile?.role === "operational";

  if (isOperational) {
    // Statistik (RPC, lintas seluruh data) dan daftar halaman ini tidak
    // saling bergantung -- dijalankan paralel, bukan satu-satu berurutan.
    const [{ data: stats }, { data: cashAdvances, count }] = await Promise.all([
      supabase.rpc("cash_advance_dashboard_stats").single(),
      supabase
        .from("cash_advances")
        .select("*, profiles:requester_id(full_name)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to),
    ]);
    const pendingCount = Number(stats?.pending_count ?? 0);
    const totalOutstanding = Number(stats?.total_outstanding ?? 0);

    const list = await attachBalances(supabase, cashAdvances ?? []);

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Menunggu Persetujuan</p>
            <p className="text-2xl font-semibold text-amber-600 mt-1">
              {pendingCount}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Total Saldo Berjalan</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">
              {formatCurrency(totalOutstanding)}
            </p>
          </div>
        </div>

        <Link
          href="/cash-advances/new"
          className="flex items-center justify-center gap-2 bg-white border border-dashed border-brand text-brand rounded-xl py-3 font-medium"
        >
          <PlusCircle size={18} />
          Ajukan Cash Advance
        </Link>

        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-2">
            Pengajuan Terbaru
          </h2>
          <div className="space-y-3">
            {list.length === 0 && (
              <p className="text-sm text-slate-500">Belum ada pengajuan.</p>
            )}
            {list.map((ca) => (
              <CashAdvanceCard key={ca.id} ca={ca} showRequester />
            ))}
          </div>
          <Pagination
            page={page}
            total={count}
            pageSize={PAGE_SIZE}
            basePath="/dashboard"
          />
        </div>
      </div>
    );
  }

  const [{ data: stats }, { data: cashAdvances, count }] = await Promise.all([
    supabase.rpc("cash_advance_dashboard_stats").single(),
    supabase
      .from("cash_advances")
      .select("*", { count: "exact" })
      .eq("requester_id", profile.id)
      .order("created_at", { ascending: false })
      .range(from, to),
  ]);
  const totalOutstanding = Number(stats?.total_outstanding ?? 0);

  const list = await attachBalances(supabase, cashAdvances ?? []);

  return (
    <div className="space-y-5">
      <div className="bg-brand rounded-xl p-4 text-white">
        <p className="text-xs text-blue-100">Total Sisa Saldo Aktif</p>
        <p className="text-2xl font-semibold mt-1">
          {formatCurrency(totalOutstanding)}
        </p>
      </div>

      <Link
        href="/cash-advances/new"
        className="flex items-center justify-center gap-2 bg-white border border-dashed border-brand text-brand rounded-xl py-3 font-medium"
      >
        <PlusCircle size={18} />
        Ajukan Cash Advance
      </Link>

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">
          Riwayat Pengajuan Saya
        </h2>
        <div className="space-y-3">
          {list.length === 0 && (
            <p className="text-sm text-slate-500">
              Belum ada pengajuan Cash Advance.
            </p>
          )}
          {list.map((ca) => (
            <CashAdvanceCard key={ca.id} ca={ca} />
          ))}
        </div>
        <Pagination
          page={page}
          total={count}
          pageSize={PAGE_SIZE}
          basePath="/dashboard"
        />
      </div>
    </div>
  );
}
