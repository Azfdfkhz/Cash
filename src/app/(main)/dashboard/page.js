import { redirect } from "next/navigation";
import { createClient, getUserProfile } from "@/lib/supabase/server";
import { getDashboardStats } from "@/lib/stats";
import { getPage, pageRange } from "@/lib/pagination";
import RequesterDashboard from "./RequesterDashboard";
import OperationalDashboard from "./OperationalDashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }) {
  const params = await searchParams;
  const page = getPage(params);
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

  // Statistik (RPC, lintas seluruh data) dan daftar halaman ini tidak saling
  // bergantung -- dijalankan paralel.
  if (isOperational) {
    const filter = params?.filter === "pending" ? "pending" : "all";
    let query = supabase
      .from("cash_advances")
      .select("*, profiles:requester_id(full_name, email, bank_name, bank_account_number)", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (filter === "pending") query = query.eq("status", "pending");

    const [stats, { data: list, count }] = await Promise.all([
      getDashboardStats(),
      query,
    ]);

    return (
      <OperationalDashboard
        name={name}
        stats={stats}
        list={list ?? []}
        count={count}
        page={page}
        filter={filter}
        currentUserId={profile.id}
      />
    );
  }

  const [stats, { data: list, count }] = await Promise.all([
    getDashboardStats(),
    supabase
      .from("cash_advances")
      .select("*, profiles:requester_id(full_name, email, bank_name, bank_account_number)", { count: "exact" })
      .eq("requester_id", profile.id)
      .order("created_at", { ascending: false })
      .range(from, to),
  ]);

  return (
    <RequesterDashboard
      name={name}
      stats={stats}
      list={list ?? []}
      count={count}
      page={page}
      currentUserId={profile.id}
    />
  );
}
