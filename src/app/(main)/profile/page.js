import Link from "next/link";
import { ChevronRight, CircleHelp, FileText, UserCog } from "lucide-react";
import { getUserProfile } from "@/lib/supabase/server";
import ProfileForm from "@/components/ProfileForm";
import ProfileSummaryCard from "@/components/ProfileSummaryCard";
import ProfileMobileHeader from "@/components/ProfileMobileHeader";
import ProfileMobileLogout from "@/components/ProfileMobileLogout";
import ProfileTourRow from "@/components/tour/ProfileTourRow";
import { getBotUsername } from "@/lib/telegram/send";

export const dynamic = "force-dynamic";

function MenuRow({ href, icon: Icon, title, subtitle, tour }) {
  return (
    <Link
      href={href}
      data-tour={tour}
      className="flex items-center gap-4 border-t border-slate-100 px-4 py-3.5 first:border-t-0 hover:bg-slate-50"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-600">
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-slate-900">
          {title}
        </span>
        <span className="block text-sm text-slate-500">{subtitle}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-slate-400" />
    </Link>
  );
}

export default async function ProfilePage() {
  const [botUsername, { user, profile }] = await Promise.all([getBotUsername(), getUserProfile()]);

  return (
    <div className="space-y-4 lg:space-y-6">
      <h1 className="hidden text-2xl font-bold text-slate-900 lg:block">
        Profil
      </h1>

      <ProfileMobileHeader
        fullName={profile?.full_name}
        email={profile?.email}
        role={profile?.role}
      />

      <div className="space-y-6 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start lg:gap-6 lg:space-y-0">
        <ProfileSummaryCard
          fullName={profile?.full_name}
          email={profile?.email}
          role={profile?.role}
        />
        <div className="space-y-6">
          <ProfileForm
            profileId={profile.id}
            fullName={profile?.full_name}
            username={profile?.username}
            email={profile?.email}
            initialChatId={profile.telegram_chat_id}
            initialBankName={profile.bank_name}
            initialBankAccountNumber={profile.bank_account_number}
            initialBankAccountHolder={profile.bank_account_holder}
            botUsername={botUsername}
            canReauthWithPassword={Boolean(
              user?.app_metadata?.providers?.includes("email") || user?.user_metadata?.has_password === true
            )}
          />

          <section>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Lainnya
            </h2>
            <div data-tour="profile-help" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              {profile?.role === "operational" && (
                <MenuRow
                  href="/users"
                  icon={UserCog}
                  title="Kelola Pengguna"
                  subtitle="Mengelola Role Pengguna"
                  tour="profile-users"
                />
              )}
              <MenuRow
                href="/help"
                icon={CircleHelp}
                title="Pusat bantuan"
                subtitle="Panduan, glosarium & pengenalan"
              />
              <ProfileTourRow />
              <MenuRow
                href="/terms"
                icon={FileText}
                title="Kebijakan & ketentuan"
                subtitle="Aturan & batas SPJ"
              />
            </div>
          </section>

          <ProfileMobileLogout />
        </div>
      </div>
    </div>
  );
}
