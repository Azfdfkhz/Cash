"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ExternalLink, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import RabSection from "@/components/RabSection";
import ResubmitPanel from "@/components/ResubmitPanel";
import DisbursementSection from "@/components/DisbursementSection";
import ReturnsSection from "@/components/ReturnsSection";
import ReceiptCard from "@/components/ReceiptCard";
import ScanReceiptPopup from "@/components/ScanReceiptPopup";
import { flattenReceiptLines } from "@/lib/rab";
import {
  formatCaCode,
  formatCurrency,
  formatDate,
  formatDateTimeShort,
  formatLpjDeadline,
  FUNDING_SOURCE_LABEL,
  OBJECTIVE_LABEL,
  KIND_LABEL,
} from "@/lib/utils";

const EVENT_LABEL = {
  approved: "Disetujui",
  rejected: "Ditolak",
  resubmitted: "Diajukan ulang",
  disbursed: "Dana dicairkan",
};

function Field({ label, children }) {
  return (
    <div className="rounded-xl border border-slate-200 px-3 py-2">
      <p className="text-[10px] text-slate-500">{label}</p>
      <p className="mt-0.5 break-words text-xs font-semibold text-slate-900">{children}</p>
    </div>
  );
}

function Title({ children }) {
  return (
    <h4 className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
      {children}
    </h4>
  );
}

// Detail pengajuan lengkap sebagai pop up mengambang (menggantikan halaman
// /cash-advances/[id]). Di desktop muncul di area kosong sebelah kiri panel
// tinjau; di mobile menutupi layar. Dipakai oleh Operasional dan Requester:
// aksi yang tampil mengikuti peran & status pengajuan.
export default function CashAdvanceDetailPopup({
  ca,
  onClose,
  currentUserId,
  isOperational = false,
  initialFocus = null,
}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const disburseRef = useRef(null);
  const returnsRef = useRef(null);

  // Muat ulang tiap `ca` berganti objek (mis. setelah router.refresh() dari
  // edit RAB, ajukan ulang, cairkan, dst.) tanpa mengosongkan tampilan.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const rel = (table, select, col, asc) =>
      supabase.from(table).select(select).eq("cash_advance_id", ca.id).order(col, { ascending: asc });
    Promise.all([
      supabase
        .from("cash_advances")
        .select(
          "*, profiles:requester_id(full_name, email, bank_name, bank_account_number, bank_account_holder), disburser:disbursed_by(full_name)"
        )
        .eq("id", ca.id)
        .maybeSingle(),
      supabase
        .from("cash_advance_balances")
        .select("balance, total_spent, total_returned, total_reimbursed")
        .eq("cash_advance_id", ca.id)
        .maybeSingle(),
      rel("receipts", "*, receipt_lines(*)", "created_at", false),
      rel("cash_advance_returns", "*", "created_at", false),
      rel("cash_advance_reimbursements", "*", "created_at", false),
      rel("rab_items", "*", "position", true),
      rel("cash_advance_events", "*, profiles:actor_id(full_name)", "created_at", true),
    ]).then(([full, bal, receipts, returns, reimb, rab, events]) => {
      if (cancelled) return;
      setError(receipts.error || rab.error ? "Sebagian data gagal dimuat." : "");
      setData({
        forCa: ca,
        full: full.data,
        balanceRow: bal.data,
        receipts: receipts.data ?? [],
        returns: returns.data ?? [],
        reimbursements: reimb.data ?? [],
        rabItems: rab.data ?? [],
        events: events.data ?? [],
      });
    });
    return () => {
      cancelled = true;
    };
  }, [ca]);

  // Dibuka dari "Cairkan Sekarang": gulir ke form pencairan setelah data siap.
  useEffect(() => {
    if (!data) return;
    const target =
      initialFocus === "pencairan" ? disburseRef : initialFocus === "pengembalian" ? returnsRef : null;
    target?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [data, initialFocus]);

  // Data segar hanya dipakai kalau memang hasil muat untuk objek `ca` ini.
  const c = data && data.forCa === ca && data.full ? data.full : ca;
  const loaded = data !== null;
  const receipts = data?.receipts ?? [];
  const returns = data?.returns ?? [];
  const reimbursements = data?.reimbursements ?? [];
  const rabItems = data?.rabItems ?? [];
  const events = data?.events ?? [];

  const isOwner = c.requester_id === currentUserId;
  const isReimbursement = c.kind === "reimbursement";
  const holder =
    c.bank_account_holder || c.profiles?.bank_account_holder || c.profiles?.full_name;

  const balanceRow = data?.balanceRow;
  const balance = balanceRow?.balance ?? c.amount_requested;
  const totalSpent = balanceRow?.total_spent ?? 0;
  const totalReturned = balanceRow?.total_returned ?? 0;
  const totalReimbursed = balanceRow?.total_reimbursed ?? 0;
  const netBalance = balance - totalReturned + totalReimbursed;

  // Sama dengan can_modify_receipt() di DB.
  const hasPendingReturn = returns.some((r) => !r.confirmed_at);
  const canModifyReceipts = isReimbursement
    ? isOwner && c.status === "rejected"
    : (isOwner || isOperational) && c.status === "approved" && !hasPendingReturn;

  const canEditRab =
    (isOwner && c.status === "rejected") || (isOperational && c.status === "pending" && !isOwner);

  const categoryTotals = Object.entries(
    flattenReceiptLines(receipts).reduce((acc, line) => {
      const key = line.category || "Tanpa kategori";
      acc[key] = (acc[key] ?? 0) + Number(line.amount);
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const showMoneyFlow = c.status === "approved" || c.status === "closed";

  return (
    <>
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="animate-fade-in absolute inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4 sm:right-[420px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Detail pengajuan"
    >
      <div className="animate-scale-up flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded bg-[#eff6ff] px-1.5 py-0.5 text-[10px] font-bold text-[#2563eb]">
                {formatCaCode(c)}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wide text-brand">
                {KIND_LABEL[c.kind] ?? "Cash Advance"}
              </span>
              <StatusBadge status={c.status} className="!px-2 !py-px !text-[10px]" />
            </div>
            <h3 className="mt-1.5 break-words text-base font-bold text-slate-900">{c.purpose}</h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Diajukan oleh {c.profiles?.full_name ?? "-"} · {formatDate(c.created_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <X size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Catatan penolakan paling atas supaya requester langsung tahu apa yang direvisi */}
          {c.status === "rejected" && c.review_note && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
              <p className="text-[11px] font-bold text-rose-800">Catatan tim operasional</p>
              <p className="mt-0.5 text-xs text-rose-900">{c.review_note}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Field label={isReimbursement ? "Nominal Diajukan" : "Plafon Diajukan"}>
              {formatCurrency(c.amount_requested)}
            </Field>
            {!isReimbursement && <Field label="Tenggat LPJ / SPJ">{formatLpjDeadline(c)}</Field>}
            {c.funding_source && (
              <Field label="Sumber Dana">
                {FUNDING_SOURCE_LABEL[c.funding_source] ?? c.funding_source}
                {c.program_ref ? ` · ${c.program_ref}` : ""}
              </Field>
            )}
            {c.objective && (
              <Field label="Tujuan">{OBJECTIVE_LABEL[c.objective] ?? c.objective}</Field>
            )}
            {c.fund_usage_date && (
              <Field label="Dana Mulai Digunakan">{formatDate(c.fund_usage_date)}</Field>
            )}
            {(c.bank_name || c.bank_account_number) && (
              <Field label="Rekening Tujuan">
                {[c.bank_name, c.bank_account_number].filter(Boolean).join(" ")}
                <span className="block text-[10px] font-normal text-slate-500">a.n {holder}</span>
              </Field>
            )}
          </div>

          {showMoneyFlow && !isReimbursement && (
            <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-xl bg-slate-50 py-3 text-center">
              <div>
                <p className="text-[10px] text-slate-500">Terpakai</p>
                <p className="text-xs font-bold text-slate-900">{formatCurrency(totalSpent)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Dikembalikan</p>
                <p className="text-xs font-bold text-slate-900">{formatCurrency(totalReturned)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Sisa Saldo</p>
                <p
                  className={`text-xs font-bold ${
                    netBalance < 0 ? "text-rose-600" : netBalance > 0 ? "text-amber-600" : "text-emerald-600"
                  }`}
                >
                  {formatCurrency(netBalance)}
                </p>
              </div>
            </div>
          )}

          {!loaded && (
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 size={14} className="animate-spin" /> Memuat rincian...
            </p>
          )}
          {error && <p className="text-xs text-rose-600">{error}</p>}

          {loaded && (
            <>
              {/* RAB (CA) — bisa diubah operasional saat menunggu & requester saat ditolak */}
              {isReimbursement ? (
                categoryTotals.length > 0 && (
                  <section>
                    <Title>Rekap per Kategori</Title>
                    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-3 text-xs">
                      {categoryTotals.map(([category, amount]) => (
                        <div key={category} className="flex justify-between py-1.5">
                          <span className="text-slate-600">{category}</span>
                          <span className="font-medium text-slate-900">{formatCurrency(amount)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between py-2">
                        <span className="font-medium text-slate-700">Total</span>
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(c.amount_requested)}
                        </span>
                      </div>
                    </div>
                  </section>
                )
              ) : (
                <RabSection
                  cashAdvanceId={c.id}
                  rabUrl={c.rab_url}
                  items={rabItems}
                  receipts={receipts}
                  canEdit={canEditRab}
                  showRealization={showMoneyFlow}
                  canAssign={canModifyReceipts}
                  defaultOpen
                />
              )}

              {isOwner && c.status === "rejected" && (
                <ResubmitPanel cashAdvanceId={c.id} kind={c.kind} />
              )}

              {isOwner && isOperational && c.status === "pending" && (
                <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Menunggu persetujuan admin lain. Anda tidak bisa menyetujui pengajuan sendiri.
                </p>
              )}

              {(c.status === "approved" || c.disbursed_at) && (
                <section ref={disburseRef} className="scroll-mt-2">
                  <DisbursementSection
                    cashAdvanceId={c.id}
                    amount={c.amount_requested}
                    bankName={c.bank_name}
                    bankAccountNumber={c.bank_account_number}
                    bankAccountHolder={holder}
                    disbursedAt={c.disbursed_at}
                    disbursedByName={c.disburser?.full_name}
                    proofUrl={c.disbursement_proof_url}
                    note={c.disbursement_note}
                    canDisburse={isOperational && !isOwner && c.status === "approved"}
                    kind={c.kind}
                  />
                </section>
              )}

              {isOwner && c.status === (isReimbursement ? "rejected" : "approved") && (
                <button
                  type="button"
                  onClick={() => setScanOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-dark"
                >
                  <Camera size={16} />
                  {isReimbursement ? "Tambah Kwitansi / Bukti Transfer" : "Scan Kwitansi / Bukti Transfer"}
                </button>
              )}

              <div ref={returnsRef} className="scroll-mt-2 empty:hidden">
              <ReturnsSection
                cashAdvanceId={c.id}
                kind={c.kind}
                reportUrl={c.report_drive_url}
                bankName={c.bank_name}
                bankAccountNumber={c.bank_account_number}
                bankAccountHolder={c.bank_account_holder}
                status={c.status}
                isOwner={isOwner}
                isOperational={isOperational}
                balance={balance}
                totalReturned={totalReturned}
                returns={returns}
                amountRequested={c.amount_requested}
                totalSpent={totalSpent}
                totalReimbursed={totalReimbursed}
                reimbursements={reimbursements}
              />
              </div>

              <section>
                <Title>Kwitansi &amp; Bukti Transfer ({receipts.length})</Title>
                {!isReimbursement && c.status === "approved" && hasPendingReturn && (isOwner || isOperational) && (
                  <p className="mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    Kwitansi tidak bisa diedit atau dihapus selama ada pengembalian yang menunggu
                    konfirmasi. Batalkan pengembalian itu dulu kalau perlu mengoreksi kwitansi.
                  </p>
                )}
                {receipts.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">
                    Belum ada kwitansi atau bukti transfer.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {receipts.map((receipt) => (
                      <ReceiptCard
                        key={receipt.id}
                        receipt={receipt}
                        rabItems={rabItems}
                        canModify={canModifyReceipts}
                        kind={c.kind}
                      />
                    ))}
                  </div>
                )}
              </section>

              {events.length > 0 && (
                <section>
                  <Title>Riwayat Pengajuan</Title>
                  <ol className="space-y-2 border-l border-slate-200 pl-3.5">
                    {events.map((ev) => (
                      <li key={ev.id} className="relative text-xs">
                        <span className="absolute -left-[1.1rem] top-1.5 h-1.5 w-1.5 rounded-full bg-slate-300" />
                        <span className="font-medium text-slate-900">
                          {EVENT_LABEL[ev.action] ?? ev.action}
                        </span>{" "}
                        <span className="text-slate-500">
                          oleh {ev.profiles?.full_name ?? "-"} · {formatDateTimeShort(ev.created_at)}
                        </span>
                        {ev.note && (
                          <p className="text-[11px] text-slate-500">&ldquo;{ev.note}&rdquo;</p>
                        )}
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
          {c.rab_url && !isReimbursement ? (
            <a
              href={c.rab_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-brand"
            >
              Spreadsheet RAB <ExternalLink size={11} />
            </a>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-[#0f172a] px-5 py-2 text-xs font-bold text-white hover:bg-slate-800"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
    {scanOpen && <ScanReceiptPopup ca={c} onClose={() => setScanOpen(false)} />}
    </>
  );
}
