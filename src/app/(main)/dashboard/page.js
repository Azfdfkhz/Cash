import { redirect } from "next/navigation";
import { createClient, getUserProfile } from "@/lib/supabase/server";
import { getDashboardStats } from "@/lib/stats";
import { getKindFilter, getPage, pageRange } from "@/lib/pagination";
import RequesterDashboard from "./RequesterDashboard";
import OperationalDashboard from "./OperationalDashboard";

export const dynamic = "force-dynamic";

const LIST_SELECT =
  "*, profiles:requester_id(full_name, username, email, bank_name, bank_account_number, bank_account_holder), cash_advance_returns(confirmed_at)";

// Pengajuan yang pengembalian sisa saldonya "menunggu konfirmasi": semuanya
// diambil (jumlahnya kecil), diurutkan dari pengembalian terbaru, supaya bisa
// ditaruh paling atas daftar. `requesterId` membatasi ke milik satu pemohon.
async function loadAwaitingConfirmation(supabase, { kind, requesterId } = {}) {
  const { data: pending } = await supabase
    .from("cash_advance_returns")
    .select("cash_advance_id, created_at")
    .is("confirmed_at", null)
    .order("created_at", { ascending: false })
    .limit(500);
  const latest = new Map();
  for (const r of pending ?? []) {
    if (!latest.has(r.cash_advance_id)) latest.set(r.cash_advance_id, r.created_at);
  }
  const ids = [...latest.keys()];
  if (!ids.length) return [];
  let q = supabase.from("cash_advances").select(LIST_SELECT).in("id", ids).eq("status", "approved");
  if (kind) q = q.eq("kind", kind);
  if (requesterId) q = q.eq("requester_id", requesterId);
  const { data } = await q;
  return (data ?? []).sort((a, b) => (latest.get(b.id) < latest.get(a.id) ? -1 : 1));
}

// Halaman daftar dengan `pinned` (menunggu konfirmasi) di paling atas, lalu
// sisanya menurut `buildRest` (urut created_at desc), dipaginasi bersama.
async function pagedWithPinned(pinned, buildRest, { from, to }) {
  const total = pinned.length;
  const ids = pinned.map((ca) => ca.id);
  let q = buildRest().order("created_at", { ascending: false });
  if (ids.length) q = q.not("id", "in", `(${ids.join(",")})`);
  const needRows = to >= total;
  const { data, count } = await q.range(needRows ? Math.max(0, from - total) : 0, needRows ? to - total : 0);
  return {
    list: [...pinned.slice(from, to + 1), ...(needRows ? data ?? [] : [])],
    count: total + (count ?? 0),
  };
}

export default async function DashboardPage({ searchParams }) {
  const params = await searchParams;
  const page = getPage(params);
  const kind = getKindFilter(params);
  const { from, to } = pageRange(page);
  const { user, profile } = await getUserProfile();
  // Akun baru yang belum menyelesaikan langkah 2 diarahkan ke sana.
  // (=== null, bukan falsy: bila migrasi 0016 belum jalan, kolomnya undefined
  // dan cek ini dilewati.)
  if (profile?.profile_completed_at === null) {
    redirect("/register/complete-profile");
  }
  const supabase = await createClient();
  const isOperational = profile?.role === "operational";
  const name = profile?.full_name ?? user?.email ?? "";

  // ?ca=<id> (dari tautan lama /cash-advances/<id>, notifikasi Telegram, atau
  // kembali dari halaman scan): buka pop up detail pengajuan itu, walau tidak
  // ada di halaman daftar saat ini. RLS menentukan siapa yang boleh melihat.
  const focusId = typeof params?.ca === "string" ? params.ca : null;
  const focusSelect =
    "*, profiles:requester_id(full_name, username, email, bank_name, bank_account_number, bank_account_holder), cash_advance_returns(confirmed_at)";
  const focusCa = focusId
    ? (await supabase.from("cash_advances").select(focusSelect).eq("id", focusId).maybeSingle()).data
    : null;

  // Statistik (RPC, lintas seluruh data) dan daftar halaman ini tidak saling
  // bergantung -- dijalankan paralel.
  if (isOperational) {
    const filter =
      params?.filter === "pending" ? "pending" : params?.filter === "confirm" ? "confirm" : "all";
    const restBuilder = () => {
      let q = supabase.from("cash_advances").select(LIST_SELECT, { count: "exact" });
      if (kind) q = q.eq("kind", kind);
      return q;
    };

    const [stats, awaiting] = await Promise.all([
      getDashboardStats(),
      loadAwaitingConfirmation(supabase, { kind }),
    ]);
    const confirmCount = awaiting.length;

    let list;
    let count;
    if (filter === "confirm") {
      list = awaiting.slice(from, to + 1);
      count = confirmCount;
    } else if (filter === "pending") {
      const { data, count: c } = await restBuilder()
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .range(from, to);
      list = data ?? [];
      count = c;
    } else {
      ({ list, count } = await pagedWithPinned(awaiting, restBuilder, { from, to }));
    }

    return (
      <OperationalDashboard
        name={name}
        stats={stats}
        list={list ?? []}
        count={count}
        page={page}
        filter={filter}
        kind={kind}
        confirmCount={confirmCount}
        currentUserId={profile.id}
        focusCa={focusCa}
      />
    );
  }

  // Pemohon: pengajuan yang pengembaliannya menunggu konfirmasi juga naik ke atas.
  const awaiting = await loadAwaitingConfirmation(supabase, { kind, requesterId: profile.id });
  const [stats, { list, count }] = await Promise.all([
    getDashboardStats(),
    pagedWithPinned(
      awaiting,
      () => {
        let q = supabase
          .from("cash_advances")
          .select(LIST_SELECT, { count: "exact" })
          .eq("requester_id", profile.id);
        if (kind) q = q.eq("kind", kind);
        return q;
      },
      { from, to }
    ),
  ]);

  return (
    <RequesterDashboard
      name={name}
      stats={stats}
      list={list ?? []}
      count={count}
      page={page}
      kind={kind}
      currentUserId={profile.id}
      focusCa={focusCa}
    />
  );
}
