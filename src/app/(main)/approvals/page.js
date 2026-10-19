import { redirect } from "next/navigation";
import { createClient, getUserProfile } from "@/lib/supabase/server";
import { getKindFilter, getPage, pageRange, PAGE_SIZE } from "@/lib/pagination";
import ApprovalsWorkspace from "@/components/ApprovalsWorkspace";
import Pagination from "@/components/Pagination";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage({ searchParams }) {
  const { profile } = await getUserProfile();
  if (profile?.role !== "operational") redirect("/dashboard");

  const params = await searchParams;
  const page = getPage(params);
  const kind = getKindFilter(params);
  const { from, to } = pageRange(page);

  const supabase = await createClient();
  const [{ data: cashAdvances, count }, { data: toDisburse }] = await Promise.all([
    supabase
      .from("cash_advances")
      .select("*, profiles:requester_id(full_name, bank_account_holder)", { count: "exact" })
      .eq("status", "pending")
      .neq("requester_id", profile.id)
      .match(kind ? { kind } : {})
      .order("created_at", { ascending: true })
      .range(from, to),
    // Sudah disetujui tapi dananya belum ditransfer ke requester.
    supabase
      .from("cash_advances")
      .select("*, profiles:requester_id(full_name, bank_account_holder)")
      .eq("status", "approved")
      .is("disbursed_at", null)
      .neq("requester_id", profile.id)
      .match(kind ? { kind } : {})
      .order("created_at", { ascending: true }),
  ]);

  return (
    <ApprovalsWorkspace
      items={cashAdvances ?? []}
      toDisburse={toDisburse ?? []}
      kind={kind}
      count={count ?? 0}
      pagination={
        <Pagination
          page={page}
          total={count}
          pageSize={PAGE_SIZE}
          basePath="/approvals"
          params={{ jenis: kind }}
        />
      }
    />
  );
}
