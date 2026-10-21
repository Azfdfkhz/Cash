import { redirect } from "next/navigation";
import { createClient, getUserProfile } from "@/lib/supabase/server";
import { getKindFilter, getPage, pageRange, PAGE_SIZE } from "@/lib/pagination";
import ApprovalsWorkspace from "@/components/ApprovalsWorkspace";
import Pagination from "@/components/Pagination";
import { buildApprovalOrFilter, getApprovalQuery, sanitizeForFilter } from "@/lib/approvalSearch";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ApprovalsPage({ searchParams }) {
  const { profile } = await getUserProfile();
  if (profile?.role !== "operational") redirect("/dashboard");

  const params = await searchParams;
  const tab = params?.tab === "pencairan" ? "pencairan" : "persetujuan";
  const page = getPage(params);
  const kind = getKindFilter(params);
  const { from, to } = pageRange(page);
  const q = getApprovalQuery(params);
  const focusParam = typeof params?.ca === "string" && UUID_RE.test(params.ca) ? params.ca : null;

  const supabase = await createClient();

  // Pencarian: cocokkan pemohon (username / nama / email) lebih dulu, lalu
  // gabungkan dengan keperluan, nomor pengajuan, dan nominal.
  let orFilter = null;
  if (q) {
    const safe = sanitizeForFilter(q);
    let profileIds = [];
    if (safe) {
      const { data: matched } = await supabase
        .from("profiles")
        .select("id")
        .or(`username.ilike.*${safe}*,full_name.ilike.*${safe}*,email.ilike.*${safe}*`)
        .limit(200);
      profileIds = (matched ?? []).map((p) => p.id);
    }
    orFilter = buildApprovalOrFilter(q, profileIds);
  }

  // Filter tiap tab. Menunggu persetujuan = pending; menunggu pencairan =
  // sudah disetujui tapi dananya belum ditransfer ke requester.
  const forTab = (query, which, k = kind) => {
    const base =
      which === "pencairan"
        ? query.eq("status", "approved").is("disbursed_at", null)
        : query.eq("status", "pending");
    const filtered = base.neq("requester_id", profile.id).match(k ? { kind: k } : {});
    return orFilter ? filtered.or(orFilter) : filtered;
  };

  const listSelect =
    tab === "pencairan"
      ? "*, profiles:requester_id(full_name, username, bank_account_holder), cash_advance_returns(confirmed_at)"
      : "*, profiles:requester_id(full_name, username, bank_account_holder)";
  const otherTab = tab === "pencairan" ? "persetujuan" : "pencairan";

  // Hanya PAGE_SIZE baris dari tab aktif yang diambil; tab lainnya cukup
  // dihitung (head count, tanpa baris).
  const [{ data: list, count: activeCount }, { count: otherCount }, focus, caCount, reimCount] = await Promise.all([
    forTab(supabase.from("cash_advances").select(listSelect, { count: "exact" }), tab)
      .order("created_at", { ascending: true })
      .range(from, to),
    forTab(
      supabase.from("cash_advances").select("id", { count: "exact", head: true }),
      otherTab
    ),
    // Dari "Cairkan Sekarang": pastikan pengajuan itu ada di daftar walau
    // letaknya bukan di halaman pertama.
    tab === "pencairan" && focusParam && page === 1
      ? forTab(
          supabase.from("cash_advances").select(listSelect).eq("id", focusParam),
          "pencairan"
        ).maybeSingle()
      : Promise.resolve({ data: null }),
    // Jumlah per jenis di tab aktif (tanpa filter jenis) untuk sub-button.
    forTab(supabase.from("cash_advances").select("id", { count: "exact", head: true }), tab, "cash_advance"),
    forTab(supabase.from("cash_advances").select("id", { count: "exact", head: true }), tab, "reimbursement"),
  ]);
  const kindCounts = {
    all: (caCount.count ?? 0) + (reimCount.count ?? 0),
    cash_advance: caCount.count ?? 0,
    reimbursement: reimCount.count ?? 0,
  };

  let items = list ?? [];
  if (focus?.data && !items.some((i) => i.id === focus.data.id)) {
    items = [focus.data, ...items];
  }

  const counts = {
    [tab]: activeCount ?? 0,
    [otherTab]: otherCount ?? 0,
  };

  return (
    <ApprovalsWorkspace
      items={items}
      tab={tab}
      counts={counts}
      kind={kind}
      kindCounts={kindCounts}
      query={q}
      focusId={focus?.data?.id ?? null}
      currentUserId={profile.id}
      pagination={
        <Pagination
          page={page}
          total={activeCount}
          pageSize={PAGE_SIZE}
          basePath={tab === "pencairan" ? "/approvals?tab=pencairan" : "/approvals"}
          params={{ jenis: kind, q }}
        />
      }
    />
  );
}
