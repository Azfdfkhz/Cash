import Link from "next/link";
import { Users } from "lucide-react";
import { getUserProfile } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import ProfileSummaryCard from "@/components/ProfileSummaryCard";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { profile } = await getUserProfile();

  return (
    <div className="space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 lg:text-2xl lg:font-bold">
          Profil
        </h1>
        <p className="text-sm text-slate-500 mt-0.5 lg:hidden">
          {profile?.full_name} &middot; {profile?.email}
        </p>
      </div>

      <div className="space-y-4 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
        <ProfileSummaryCard
          fullName={profile?.full_name}
          email={profile?.email}
          role={profile?.role}
        />
        <div className="space-y-4">
          <ProfileForm
            profileId={profile.id}
            email={profile?.email}
            initialChatId={profile.telegram_chat_id}
            initialBankName={profile.bank_name}
            initialBankAccountNumber={profile.bank_account_number}
          />
          {profile?.role === "operational" && (
            <Link
              href="/users"
              className="flex items-center gap-2 bg-white border border-slate-200 hover:border-brand text-slate-700 rounded-xl px-4 py-3 text-sm font-medium"
            >
              <Users size={18} />
              Kelola Pengguna
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
