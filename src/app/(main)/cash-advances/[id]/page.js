import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera } from "lucide-react";
import { createClient, getUserProfile } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatDate,
  FUNDING_SOURCE_LABEL,
  OBJECTIVE_LABEL,
} from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import ReceiptCard from "@/components/ReceiptCard";
import ApprovalActions from "@/components/ApprovalActions";
import ReturnsSection from "@/components/ReturnsSection";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

export default async function CashAdvanceDetailPage({ params }) {
  const { id } = await params;
  const { profile } = await getUserProfile();
  const supabase = await createClient();

  // Kelima query ini cuma butuh `id`, tidak saling bergantung -- dijalankan
  // paralel (bukan satu-satu berurutan) supaya total waktu tunggu halaman ini
  // cuma sepanjang query yang paling lambat, bukan jumlah kelimanya.
  const [
    { data: ca },
    { data: balanceRow },
    { data: receipts },
    { data: returns },
    { data: reimbursements },
  ] = await Promise.all([
    supabase
      .from("cash_advances")
      .select("*, profiles:requester_id(full_name, email)")
      .eq("id", id)
      .single(),
    supabase
      .from("cash_advance_balances")
      .select("balance, total_spent, total_returned, total_reimbursed")
      .eq("cash_advance_id", id)
      .single(),
    supabase
      .from("receipts")
      .select("*")
      .eq("cash_advance_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("cash_advance_returns")
      .select("*")
      .eq("cash_advance_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("cash_advance_reimbursements")
      .select("*")
      .eq("cash_advance_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!ca) notFound();

  const isOwner = ca.requester_id === profile.id;
  const isOperational = profile.role === "operational";
  const balance = balanceRow?.balance ?? ca.amount_requested;
  const totalSpent = balanceRow?.total_spent ?? 0;
  const totalReturned = balanceRow?.total_returned ?? 0;
  const totalReimbursed = balanceRow?.total_reimbursed ?? 0;
  const netBalance = balance - totalReturned + totalReimbursed;

  return (
    <div className="space-y-4">
      <BackButton />

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-slate-900">{ca.purpose}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Diajukan oleh {ca.profiles?.full_name} &middot;{" "}
              {formatDate(ca.created_at)}
            </p>
          </div>
          <StatusBadge status={ca.status} />
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div>
            <p className="text-xs text-slate-500">Diajukan</p>
            <p className="font-semibold text-slate-900 text-sm mt-0.5">
              {formatCurrency(ca.amount_requested)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Terpakai</p>
            <p className="font-semibold text-slate-900 text-sm mt-0.5">
              {formatCurrency(totalSpent)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Sisa Saldo</p>
            <p
              className={`font-semibold text-sm mt-0.5 ${
                netBalance < 0
                  ? "text-rose-600"
                  : netBalance > 0
                    ? "text-amber-600"
                    : "text-emerald-600"
              }`}
            >
              {formatCurrency(netBalance)}
            </p>
          </div>
        </div>

        {(ca.fund_usage_date || ca.objective || ca.funding_source || ca.rab_url) && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {ca.fund_usage_date && (
              <div className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-xs text-slate-500">
                  Tanggal Dana Mulai Digunakan
                </p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">
                  {formatDate(ca.fund_usage_date)}
                </p>
              </div>
            )}
            {ca.objective && (
              <div className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-xs text-slate-500">Tujuan</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">
                  {OBJECTIVE_LABEL[ca.objective] ?? ca.objective}
                </p>
              </div>
            )}
            {ca.funding_source && (
              <div className="bg-slate-50 rounded-lg px-3 py-2">
                <p className="text-xs text-slate-500">Sumber Dana</p>
                <p className="text-sm font-medium text-slate-900 mt-0.5">
                  {FUNDING_SOURCE_LABEL[ca.funding_source] ?? ca.funding_source}
                  {ca.program_ref ? ` · ${ca.program_ref}` : ""}
                </p>
              </div>
            )}
            {ca.rab_url && (
              <div className="bg-slate-50 rounded-lg px-3 py-2 col-span-2">
                <p className="text-xs text-slate-500">RAB</p>
                <a
                  href={ca.rab_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-brand mt-0.5 break-all underline"
                >
                  {ca.rab_url}
                </a>
              </div>
            )}
          </div>
        )}

        {(ca.bank_name || ca.bank_account_number) && (
          <div className="mt-4 bg-slate-50 rounded-lg px-3 py-2">
            <p className="text-xs text-slate-500">Rekening Tujuan Transfer</p>
            <p className="text-sm font-medium text-slate-900 mt-0.5">
              {ca.bank_name} &middot; {ca.bank_account_number}
            </p>
          </div>
        )}

        {ca.review_note && (
          <p className="text-xs text-slate-500 mt-4 bg-slate-50 rounded-lg px-3 py-2">
            Catatan: {ca.review_note}
          </p>
        )}
      </div>

      {isOperational && ca.status === "pending" && !isOwner && (
        <ApprovalActions cashAdvanceId={ca.id} />
      )}

      {isOwner && isOperational && ca.status === "pending" && (
        <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          Menunggu persetujuan admin lain. Anda tidak bisa menyetujui
          pengajuan sendiri.
        </div>
      )}

      {isOwner && ca.status === "approved" && (
        <Link
          href={`/cash-advances/${ca.id}/scan`}
          className="flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white rounded-xl py-3 font-medium"
        >
          <Camera size={18} />
          Scan Kwitansi
        </Link>
      )}

      <ReturnsSection
        cashAdvanceId={ca.id}
        status={ca.status}
        isOwner={isOwner}
        isOperational={isOperational}
        balance={balance}
        totalReturned={totalReturned}
        returns={returns}
        totalReimbursed={totalReimbursed}
        reimbursements={reimbursements}
      />

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">
          Kwitansi ({receipts?.length ?? 0})
        </h2>
        <div className="space-y-2">
          {(!receipts || receipts.length === 0) && (
            <p className="text-sm text-slate-500">Belum ada kwitansi.</p>
          )}
          {receipts?.map((receipt) => (
            <ReceiptCard key={receipt.id} receipt={receipt} />
          ))}
        </div>
      </div>
    </div>
  );
}
