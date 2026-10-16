import { redirect } from "next/navigation";
import { createClient, getUserProfile } from "@/lib/supabase/server";
import { getPage, pageRange, PAGE_SIZE } from "@/lib/pagination";
import ApprovalsWorkspace from "@/components/ApprovalsWorkspace";
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
    <ApprovalsWorkspace
      items={cashAdvances ?? []}
      count={count ?? 0}
      pagination={
        <Pagination
          page={page}
          total={count}
          pageSize={PAGE_SIZE}
          basePath="/approvals"
        />
      }
    />
  );
}
