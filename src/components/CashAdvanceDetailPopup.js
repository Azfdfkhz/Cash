"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, Camera, ExternalLink, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import StatusBadge from "@/components/StatusBadge";
import ReturnPendingBadge from "@/components/ReturnPendingBadge";
import RabSection from "@/components/RabSection";
import ResubmitPanel from "@/components/ResubmitPanel";
import DisbursementSection from "@/components/DisbursementSection";
import ReturnsSection from "@/components/ReturnsSection";
import ReceiptCard from "@/components/ReceiptCard";
import ScanReceiptPopup from "@/components/ScanReceiptPopup";
import { flattenReceiptLines } from "@/lib/rab";
import {
  DetailTabSkeleton,
  MoneyFlowSkeleton,
} from "@/components/skeletons/ListSkeletons";
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

const EVENT_DOT = {
  approved: "bg-emerald-500",
  rejected: "bg-rose-500",
  resubmitted: "bg-amber-500",
  disbursed: "bg-blue-500",
};

// Label di atas, nilai di bawah, tanpa kotak: satu kartu pembungkus cukup.
function Info({ label, children, className = "" }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-[11px] font-medium text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-[13px] font-semibold text-slate-900">{children}</dd>
    </div>
  );
}

function Title({ children, className = "" }) {
  return (
    <h4 className={`mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${className}`}>
      {children}
    </h4>
  );
}

// Detail pengajuan lengkap sebagai pop up mengambang (menggantikan halaman
// /cash-advances/[id]). Di desktop muncul di area kosong sebelah kiri panel
// tinjau; di mobile menutupi layar. `standalone`: dibuka sendiri (tanpa panel
// tinjau), menutupi seluruh layar di halaman yang sedang dibuka. `inline`:
// tanpa overlay, mengisi kotak induknya (dipakai panel Persetujuan desktop);
// `headerActions` menggantikan tombol tutup di header. Dipakai oleh Operasional dan Requester:
// aksi yang tampil mengikuti peran & status pengajuan.
export default function CashAdvanceDetailPopup({
  ca,
  onClose,
  currentUserId,
  isOperational = false,
  initialFocus = null,
  standalone = false,
  inline = false,
  headerActions = null,
}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [tab, setTab] = useState("ringkasan");
  const scrollRef = useRef(null);
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
  const spentPct =
    Number(c.amount_requested) > 0
      ? Math.min(100, Math.round((totalSpent / Number(c.amount_requested)) * 100))
      : 0;
  const canScan = isOwner && c.status === (isReimbursement ? "rejected" : "approved");

  const tabs = [
    { id: "ringkasan", label: "Ringkasan" },
    ...(!isReimbursement ? [{ id: "rab", label: "RAB", count: rabItems.length }] : []),
    { id: "kwitansi", label: "Kwitansi", count: receipts.length },
    ...(events.length > 0 ? [{ id: "riwayat", label: "Riwayat" }] : []),
  ];

  function selectTab(id) {
    setTab(id);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }

  const hasFooter = (c.rab_url && !isReimbursement) || canScan;

  return (
    <>
    <div
      onClick={inline ? undefined : (e) => e.target === e.currentTarget && onClose()}
      className={
        inline
          ? "h-full min-h-0"
          : `animate-fade-in inset-0 flex items-center justify-center bg-slate-900/40 p-4 sm:p-6 ${
              standalone ? "fixed z-50" : "absolute z-20 sm:right-[420px]"
            }`
      }
      role={inline ? undefined : "dialog"}
      aria-modal={inline ? undefined : "true"}
      aria-label={inline ? undefined : "Detail pengajuan"}
    >
      <div
        className={
          inline
            ? "flex h-full min-h-0 w-full flex-col overflow-hidden"
            : "animate-scale-up flex h-full max-h-[44rem] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
        }
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 px-6 pb-3 pt-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded bg-[#eff6ff] px-1.5 py-0.5 text-[11px] font-bold text-[#2563eb]">
                {formatCaCode(c)}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {KIND_LABEL[c.kind] ?? "Cash Advance"}
              </span>
              <StatusBadge status={c.status} className="!px-2 !py-px !text-[11px]" />
              {c.status === "approved" && hasPendingReturn && (
                <ReturnPendingBadge operational={isOperational} />
              )}
            </div>
            <h3 className="mt-2 break-words text-lg font-bold leading-snug text-slate-900">{c.purpose}</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Diajukan oleh {c.profiles?.full_name ?? "-"} · {formatDate(c.created_at)}
            </p>
          </div>
          {inline ? (
            headerActions
          ) : (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup detail"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* ── Tab ── */}
        <div role="tablist" className="flex gap-5 overflow-x-auto border-b border-slate-200 px-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => selectTab(t.id)}
              className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 py-2.5 text-[13px] font-semibold transition-colors ${
                tab === t.id
                  ? "border-brand text-brand"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span
                  className={`rounded-full px-1.5 text-[11px] font-bold ${
                    tab === t.id ? "bg-brand/10 text-brand" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Konten ── */}
        <div ref={scrollRef} className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {!loaded && (
            <p className="sr-only" role="status">
              Memuat rincian...
            </p>
          )}
          {error && <p className="text-xs text-rose-600">{error}</p>}

          {tab === "ringkasan" && (
            <>
              {/* Catatan penolakan paling atas supaya requester langsung tahu apa yang direvisi */}
              {c.status === "rejected" && c.review_note && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <p className="text-xs font-bold text-rose-800">Catatan tim operasional</p>
                  <p className="mt-0.5 text-[13px] text-rose-900">{c.review_note}</p>
                </div>
              )}

              {/* Ringkasan angka: satu blok */}
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-slate-500">
                      {isReimbursement ? "Nominal Diajukan" : "Plafon Diajukan"}
                    </p>
                    <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900">
                      {formatCurrency(c.amount_requested)}
                    </p>
                  </div>
                  {!isReimbursement && (
                    <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 ring-1 ring-slate-200">
                      <Calendar size={14} className="text-brand" />
                      <div>
                        <p className="text-[10px] font-medium text-slate-500">Tenggat LPJ / SPJ</p>
                        <p className="text-xs font-bold text-slate-900">{formatLpjDeadline(c)}</p>
                      </div>
                    </div>
                  )}
                </div>

                {showMoneyFlow && !isReimbursement && !loaded && <MoneyFlowSkeleton />}
                {showMoneyFlow && !isReimbursement && loaded && (
                  <>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${spentPct >= 100 ? "bg-amber-500" : "bg-brand"}`}
                        style={{ width: `${spentPct}%` }}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[11px] text-slate-500">Terpakai ({spentPct}%)</p>
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(totalSpent)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500">Dikembalikan</p>
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(totalReturned)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-slate-500">Sisa Saldo</p>
                        <p
                          className={`text-sm font-bold ${
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
                  </>
                )}
              </div>

              {/* Informasi pengajuan */}
              <dl className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
                {c.funding_source && (
                  <Info label="Sumber Dana">
                    {FUNDING_SOURCE_LABEL[c.funding_source] ?? c.funding_source}
                    {c.program_ref ? ` · ${c.program_ref}` : ""}
                  </Info>
                )}
                {c.objective && (
                  <Info label="Tujuan">{OBJECTIVE_LABEL[c.objective] ?? c.objective}</Info>
                )}
                {c.fund_usage_date && (
                  <Info label="Dana Mulai Digunakan">{formatDate(c.fund_usage_date)}</Info>
                )}
                {(c.bank_name || c.bank_account_number) && (
                  <Info label="Rekening Tujuan" className="col-span-2 sm:col-span-3">
                    {[c.bank_name, c.bank_account_number].filter(Boolean).join(" ")}
                    <span className="ml-1.5 font-normal text-slate-500">a.n {holder}</span>
                  </Info>
                )}
              </dl>

              {isReimbursement && categoryTotals.length > 0 && (
                <section>
                  <Title>Rekap per Kategori</Title>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 px-4 text-[13px]">
                    {categoryTotals.map(([category, amount]) => (
                      <div key={category} className="flex justify-between py-2">
                        <span className="text-slate-600">{category}</span>
                        <span className="font-medium text-slate-900">{formatCurrency(amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2.5">
                      <span className="font-medium text-slate-700">Total</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(c.amount_requested)}
                      </span>
                    </div>
                  </div>
                </section>
              )}

              {!loaded && <DetailTabSkeleton rows={2} />}

              {loaded && (
                <>
                  {isOwner && c.status === "rejected" && (
                    <ResubmitPanel cashAdvanceId={c.id} kind={c.kind} />
                  )}

                  {isOwner && isOperational && c.status === "pending" && (
                    <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-600 ring-1 ring-slate-100">
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
                </>
              )}
            </>
          )}

          {(tab === "rab" || tab === "kwitansi") && !loaded && <DetailTabSkeleton />}

          {tab === "rab" && loaded && !isReimbursement && (
            <RabSection
              bare
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

          {tab === "kwitansi" && loaded && (
            <section>
              {!isReimbursement && c.status === "approved" && hasPendingReturn && (isOwner || isOperational) && (
                <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Kwitansi tidak bisa diedit atau dihapus selama ada pengembalian yang menunggu
                  konfirmasi. Batalkan pengembalian itu dulu kalau perlu mengoreksi kwitansi.
                </p>
              )}
              {receipts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
                  <p className="text-[13px] font-medium text-slate-600">Belum ada kwitansi</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Kwitansi dan bukti transfer yang dicatat akan muncul di sini.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
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
          )}

          {tab === "riwayat" && events.length > 0 && (
            <section>
              <ol className="space-y-4 border-l border-slate-200 pl-5">
                {events.map((ev) => (
                  <li key={ev.id} className="relative text-[13px]">
                    <span
                      className={`absolute -left-[1.6rem] top-1.5 h-2 w-2 rounded-full ring-4 ring-white ${
                        EVENT_DOT[ev.action] ?? "bg-slate-300"
                      }`}
                    />
                    <p className="font-semibold text-slate-900">{EVENT_LABEL[ev.action] ?? ev.action}</p>
                    <p className="text-xs text-slate-500">
                      oleh {ev.profiles?.full_name ?? "-"} · {formatDateTimeShort(ev.created_at)}
                    </p>
                    {ev.note && (
                      <p className="mt-1 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                        &ldquo;{ev.note}&rdquo;
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* ── Footer: hanya muncul kalau ada aksi (tombol X di header sudah menutup) ── */}
        {hasFooter && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-3">
            {c.rab_url && !isReimbursement ? (
              <a
                href={c.rab_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand"
              >
                Spreadsheet RAB <ExternalLink size={12} />
              </a>
            ) : (
              <span />
            )}
            {canScan && (
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className="inline-flex items-center gap-2 rounded-full bg-[#0f172a] px-5 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                <Camera size={14} />
                {isReimbursement ? "Tambah Kwitansi" : "Scan Kwitansi"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
    {scanOpen && <ScanReceiptPopup ca={c} onClose={() => setScanOpen(false)} />}
    </>
  );
}
