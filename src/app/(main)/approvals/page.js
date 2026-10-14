import { redirect } from "next/navigation";
import { createClient, getUserProfile } from "@/lib/supabase/server";
import { getPage, pageRange, PAGE_SIZE } from "@/lib/pagination";
import CashAdvanceCard from "@/components/CashAdvanceCard";
import Pagination from "@/components/Pagination";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage({ searchParams }) {
  const { profile } = await getUserProfile();
  if (profile?.role !== "operational") redirect("/dashboard");

  const page = getPage(await searchParams);
  const { from, to } = pageRange(page);

  const supabase = await createClient();
  const { data: cashAdvances, count } = await supabase
    .from("cash_advances")
    .select("*, profiles:requester_id(full_name)", { count: "exact" })
    .eq("status", "pending")
    .neq("requester_id", profile.id)
    .order("created_at", { ascending: true })
    .range(from, to);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Persetujuan</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          {count ?? 0} pengajuan Cash Advance menunggu persetujuan Anda.
        </p>
      </div>

      <div className="space-y-3">
        {(!cashAdvances || cashAdvances.length === 0) && (
          <p className="text-sm text-slate-500">
            Tidak ada pengajuan yang menunggu persetujuan.
          </p>
        )}
        {cashAdvances?.map((ca) => (
          <CashAdvanceCard key={ca.id} ca={ca} showRequester />
        ))}
      </div>

      <Pagination
        page={page}
        total={count}
        pageSize={PAGE_SIZE}
        basePath="/approvals"
      />
    </div>
  );
}
