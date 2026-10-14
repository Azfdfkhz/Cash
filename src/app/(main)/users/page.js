import { redirect } from "next/navigation";
import { createClient, getUserProfile } from "@/lib/supabase/server";
import UserRoleRow from "@/components/UserRoleRow";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const { profile } = await getUserProfile();
  if (profile?.role !== "operational") redirect("/dashboard");

  const supabase = await createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, role")
    .order("full_name", { ascending: true });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Kelola Pengguna
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Atur siapa yang punya akses Tim Operasional.
        </p>
      </div>

      <div className="space-y-2">
        {(profiles ?? []).map((p) => (
          <UserRoleRow key={p.id} user={p} currentUserId={profile.id} />
        ))}
      </div>
    </div>
  );
}
