import Link from "next/link";
import { notFound } from "next/navigation";
import { Camera } from "lucide-react";
import { createClient, getUserProfile } from "@/lib/supabase/server";
import {
  formatCurrency,
  formatDate,
  FUNDING_SOURCE_LABEL,
  OBJECTIVE_LABEL,
  KIND_LABEL,
} from "@/lib/utils";
import StatusBadge from "@/components/StatusBadge";
import ReceiptCard from "@/components/ReceiptCard";
import ApprovalActions from "@/components/ApprovalActions";
import ReturnsSection from "@/components/ReturnsSection";
import BackButton from "@/components/BackButton";
import RabSection from "@/components/RabSection";
import { flattenReceiptLines } from "@/lib/rab";
import ResubmitPanel from "@/components/ResubmitPanel";
import DisbursementSection from "@/components/DisbursementSection";

const EVENT_LABEL = {
  approved: "Disetujui",
  rejected: "Ditolak",
  resubmitted: "Diajukan ulang",
  disbursed: "Dana dicairkan",
};

export const dynamic = "force-dynamic";

export default async function CashAdvanceDetailPage({ params }) {
  const { id } = await params;
  const { profile } = await getUserProfile();
  const supabase = await createClient();

  // Ketujuh query ini cuma butuh `id`, tidak saling bergantung -- dijalankan
  // paralel (bukan satu-satu berurutan) supaya total waktu tunggu halaman ini
  // cuma sepanjang query yang paling lambat, bukan jumlah ketujuhnya.
  const [
    { data: ca },
    { data: balanceRow },
    { data: receipts },
    { data: returns },
    { data: reimbursements },
    { data: rabItems },
    { data: events },
  ] = await Promise.all([
    supabase
      .from("cash_advances")
      .select(
        "*, profiles:requester_id(full_name, email), disburser:disbursed_by(full_name)"
      )
      .eq("id", id)
      .single(),
    supabase
      .from("cash_advance_balances")
      .select("balance, total_spent, total_returned, total_reimbursed")
      .eq("cash_advance_id", id)
      .single(),
    supabase
      .from("receipts")
      .select("*, receipt_lines(*)")
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
    supabase
      .from("rab_items")
      .select("*")
      .eq("cash_advance_id", id)
      .order("position"),
    supabase
      .from("cash_advance_events")
      .select("*, profiles:actor_id(full_name)")
      .eq("cash_advance_id", id)
      .order("created_at"),
  ]);

  if (!ca) notFound();

  const isOwner = ca.requester_id === profile.id;
  const isOperational = profile.role === "operational";
  const balance = balanceRow?.balance ?? ca.amount_requested;
  const totalSpent = balanceRow?.total_spent ?? 0;
  const totalReturned = balanceRow?.total_returned ?? 0;
  const totalReimbursed = balanceRow?.total_reimbursed ?? 0;
  const netBalance = balance - totalReturned + totalReimbursed;
  // Sama dengan can_modify_receipt() di DB: hanya saat approved dan tidak
  // ada pengembalian yang menunggu konfirmasi.
  // Reimbursement: kwitansi hanya bisa direvisi pemiliknya saat ditolak.
  const isReimbursement = ca.kind === "reimbursement";
  const hasPendingReturn = (returns ?? []).some((r) => !r.confirmed_at);
  const canModifyReceipts = isReimbursement
    ? isOwner && ca.status === "rejected"
    : (isOwner || isOperational) && ca.status === "approved" && !hasPendingReturn;

  // Rekap per kategori untuk reimbursement (pengganti perbandingan RAB).
  const categoryTotals = Object.entries(
    flattenReceiptLines(receipts).reduce((acc, line) => {
      const key = line.category || "Tanpa kategori";
      acc[key] = (acc[key] ?? 0) + Number(line.amount);
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4 lg:max-w-4xl">
      <BackButton />

      <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:rounded-3xl lg:p-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand">
              {KIND_LABEL[ca.kind] ?? "Cash Advance"}
            </p>
            <p className="font-semibold text-slate-900">{ca.purpose}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Diajukan oleh {ca.profiles?.full_name} &middot;{" "}
              {formatDate(ca.created_at)}
            </p>
          </div>
          <StatusBadge status={ca.status} />
        </div>

        {isReimbursement ? (
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div>
              <p className="text-xs text-slate-500">Total Klaim</p>
              <p className="font-semibold text-slate-900 text-sm mt-0.5">
                {formatCurrency(ca.amount_requested)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Kwitansi</p>
              <p className="font-semibold text-slate-900 text-sm mt-0.5">
                {receipts?.length ?? 0} bukti
              </p>
            </div>
          </div>
        ) : (
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
        )}

        {(ca.fund_usage_date || ca.objective || ca.funding_source) && (
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
          </div>
        )}

        {(ca.bank_name || ca.bank_account_number) && (
          <div className="mt-4 bg-slate-50 rounded-lg px-3 py-2">
            <p className="text-xs text-slate-500">Rekening Tujuan Transfer</p>
            <p className="text-sm font-medium text-slate-900 mt-0.5">
              {ca.bank_name} &middot; {ca.bank_account_number}
              {ca.bank_account_holder && (
                <span className="font-normal text-slate-600">
                  {" "}a.n. {ca.bank_account_holder}
                </span>
              )}
            </p>
          </div>
        )}

        {ca.review_note && (
          <p className="text-xs text-slate-500 mt-4 bg-slate-50 rounded-lg px-3 py-2">
            Catatan: {ca.review_note}
          </p>
        )}
      </div>

      {isReimbursement ? (
        categoryTotals.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:rounded-3xl lg:p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-2">
              Rekap per Kategori
            </h2>
            <div className="divide-y divide-slate-100 text-sm">
              {categoryTotals.map(([category, amount]) => (
                <div key={category} className="flex justify-between py-1.5">
                  <span className="text-slate-600">{category}</span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency(amount)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between pt-2">
                <span className="font-medium text-slate-700">Total</span>
                <span className="font-semibold text-slate-900">
                  {formatCurrency(ca.amount_requested)}
                </span>
              </div>
            </div>
          </div>
        )
      ) : (
      <RabSection
        cashAdvanceId={ca.id}
        rabUrl={ca.rab_url}
        items={rabItems ?? []}
        receipts={receipts}
        canEdit={
          (isOwner && ca.status === "rejected") ||
          (isOperational && ca.status === "pending" && !isOwner)
        }
        showRealization={ca.status === "approved" || ca.status === "closed"}
        canAssign={canModifyReceipts}
      />
      )}

      {isOwner && ca.status === "rejected" && (
        <ResubmitPanel cashAdvanceId={ca.id} kind={ca.kind} />
      )}

      {events?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 lg:rounded-3xl lg:p-6">
          <h2 className="text-sm font-semibold text-slate-700 mb-2">
            Riwayat Pengajuan
          </h2>
          <ol className="space-y-2">
            {events.map((event) => (
              <li key={event.id} className="text-sm">
                <p className="text-slate-900">
                  <span className="font-medium">
                    {EVENT_LABEL[event.action] ?? event.action}
                  </span>{" "}
                  <span className="text-slate-500">
                    oleh {event.profiles?.full_name ?? "-"} &middot;{" "}
                    {formatDate(event.created_at)}
                  </span>
                </p>
                {event.note && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    &ldquo;{event.note}&rdquo;
                  </p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {isOperational && ca.status === "pending" && !isOwner && (
        <ApprovalActions cashAdvanceId={ca.id} />
      )}

      {isOwner && isOperational && ca.status === "pending" && (
        <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          Menunggu persetujuan admin lain. Anda tidak bisa menyetujui
          pengajuan sendiri.
        </div>
      )}

      {(ca.status === "approved" || ca.disbursed_at) && (
        <DisbursementSection
          cashAdvanceId={ca.id}
          amount={ca.amount_requested}
          bankName={ca.bank_name}
          bankAccountNumber={ca.bank_account_number}
          bankAccountHolder={ca.bank_account_holder}
          disbursedAt={ca.disbursed_at}
          disbursedByName={ca.disburser?.full_name}
          proofUrl={ca.disbursement_proof_url}
          note={ca.disbursement_note}
          canDisburse={isOperational && !isOwner && ca.status === "approved"}
          kind={ca.kind}
        />
      )}

      {isOwner && ca.status === (isReimbursement ? "rejected" : "approved") && (
        <Link
          href={`/cash-advances/${ca.id}/scan`}
          className="flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white rounded-xl py-3 font-medium"
        >
          <Camera size={18} />
          {isReimbursement ? "Tambah Kwitansi / Bukti Transfer" : "Scan Kwitansi / Bukti Transfer"}
        </Link>
      )}

      <ReturnsSection
        cashAdvanceId={ca.id}
        kind={ca.kind}
        reportUrl={ca.report_drive_url}
        bankName={ca.bank_name}
        bankAccountNumber={ca.bank_account_number}
        bankAccountHolder={ca.bank_account_holder}
        status={ca.status}
        isOwner={isOwner}
        isOperational={isOperational}
        balance={balance}
        totalReturned={totalReturned}
        returns={returns}
        amountRequested={ca.amount_requested}
        totalSpent={totalSpent}
        totalReimbursed={totalReimbursed}
        reimbursements={reimbursements}
      />

      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">
          Kwitansi &amp; Bukti Transfer ({receipts?.length ?? 0})
        </h2>
        {!isReimbursement && ca.status === "approved" && hasPendingReturn && (isOwner || isOperational) && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
            Kwitansi tidak bisa diedit atau dihapus selama ada pengembalian yang
            menunggu konfirmasi. Batalkan pengembalian itu dulu kalau perlu
            mengoreksi kwitansi.
          </p>
        )}
        <div className="space-y-2">
          {(!receipts || receipts.length === 0) && (
            <p className="text-sm text-slate-500">
              Belum ada kwitansi atau bukti transfer.
            </p>
          )}
          {receipts?.map((receipt) => (
            <ReceiptCard
              key={receipt.id}
              receipt={receipt}
              rabItems={rabItems ?? []}
              canModify={canModifyReceipts}
              kind={ca.kind}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
