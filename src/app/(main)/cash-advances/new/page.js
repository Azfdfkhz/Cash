"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notifyOps } from "@/lib/receiptScan";
import RabEditor, { newRabItem, toRabRows } from "@/components/RabEditor";
import RequestShell from "@/components/request/RequestShell";
import ValidationSummary from "@/components/request/ValidationSummary";
import SubmitSuccessModal from "@/components/request/SubmitSuccessModal";
import BankAccountField from "@/components/request/BankAccountField";
import DraftPrompt from "@/components/request/DraftPrompt";
import LeaveDialog from "@/components/request/LeaveDialog";
import {
  Field,
  SelectField,
  inputCls,
  formatWeekdayDate,
  maskedAccount,
} from "@/components/request/fields";
import { clearDraft, loadDraft } from "@/lib/draft";
import { useAutoDraft } from "@/lib/useAutoDraft";
import { useLeaveGuard } from "@/lib/useLeaveGuard";
import { formatCurrency, formatDateLong } from "@/lib/utils";
import { rabTotal } from "@/lib/rab";

const FORM_ID = "new-cash-advance-form";
const DRAFT_KIND = "cash_advance";

export default function NewCashAdvancePage() {
  const router = useRouter();
  const [purpose, setPurpose] = useState("");
  const [fundUsageDate, setFundUsageDate] = useState("");
  const [fundingSource, setFundingSource] = useState("");
  const [programRef, setProgramRef] = useState("");
  const [objective, setObjective] = useState("");
  const [rabUrl, setRabUrl] = useState("");
  const [rabItems, setRabItems] = useState(() => [newRabItem()]);
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  // true kalau rekening default di profil belum lengkap -> tampilkan info
  // untuk mengaturnya di Pengaturan supaya pengajuan berikutnya terisi sendiri.
  const [profileBankMissing, setProfileBankMissing] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [success, setSuccess] = useState(null);
  const [draftNotice, setDraftNotice] = useState("");
  // Autosave baru aktif setelah draft lama selesai dipulihkan.
  const [restored, setRestored] = useState(false);
  const errorRef = useRef(null);

  function fail(message) {
    setError(message);
    requestAnimationFrame(() =>
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    );
  }

  // Ada draft tersimpan? Tanyakan dulu (pop up) -- jangan dipulihkan diam-diam.
  // Autosave menunggu pilihan user (`restored`), supaya draft lama tidak tertimpa.
  const [pendingDraft, setPendingDraft] = useState(null);
  useEffect(() => {
    // Dibaca dari localStorage setelah mount (bukan saat render, agar hidrasi cocok);
    // setState ditunda ke callback supaya tidak dipanggil sinkron di badan efek.
    const t = setTimeout(() => {
      const d = loadDraft(DRAFT_KIND);
      if (d) setPendingDraft(d);
      else setRestored(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  function continueDraft() {
    const draft = pendingDraft;
    setPendingDraft(null);
    setPurpose(draft.purpose ?? "");
    setFundUsageDate(draft.fundUsageDate ?? "");
    setFundingSource(draft.fundingSource ?? "");
    setProgramRef(draft.programRef ?? "");
    setObjective(draft.objective ?? "");
    setRabUrl(draft.rabUrl ?? "");
    if (draft.rabItems?.length) setRabItems(draft.rabItems.map((it) => newRabItem(it)));
    setBankName((prev) => draft.bankName || prev);
    setBankAccountNumber((prev) => draft.bankAccountNumber || prev);
    setBankAccountHolder((prev) => draft.bankAccountHolder || prev);
    setDraftNotice("Draft dilanjutkan. Lengkapi isian, lalu kirim.");
    setRestored(true);
  }

  function discardDraft() {
    clearDraft(DRAFT_KIND);
    setPendingDraft(null);
    setRestored(true);
  }

  // Prefill rekening tujuan dari profil supaya tidak perlu diketik ulang tiap
  // pengajuan. Pakai functional updater + `prev ||` agar tidak menimpa kalau
  // user sudah sempat mengetik sebelum query selesai.
  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("bank_name, bank_account_number, bank_account_holder")
        .eq("id", user.id)
        .single();
      if (!active || !profile) return;
      setProfileBankMissing(
        !profile.bank_name || !profile.bank_account_number || !profile.bank_account_holder
      );
      setBankName((prev) => prev || profile.bank_name || "");
      setBankAccountNumber((prev) => prev || profile.bank_account_number || "");
      setBankAccountHolder((prev) => prev || profile.bank_account_holder || "");
    })();
    return () => {
      active = false;
    };
  }, []);

  // Draft otomatis: tersimpan tiap perubahan, saat keluar/pindah halaman, saat
  // koneksi putus, dan saat pengiriman gagal. Rekening dari profil tidak ikut
  // dihitung sebagai isian (terisi sendiri).
  const draftData = {
    purpose,
    fundUsageDate,
    fundingSource,
    programRef,
    objective,
    rabUrl,
    rabItems: rabItems.map(({ _key, ...rest }) => rest),
    bankName,
    bankAccountNumber,
    bankAccountHolder,
  };
  const { flush, finish, savedAt, meaningful } = useAutoDraft({
    kind: DRAFT_KIND,
    data: draftData,
    enabled: restored,
    isMeaningful: (d) =>
      Boolean(
        d.purpose.trim() ||
          d.fundUsageDate ||
          d.fundingSource ||
          d.programRef.trim() ||
          d.objective ||
          d.rabUrl.trim() ||
          d.rabItems.some((it) => it.description?.trim() || Number(it.unit_price) > 0)
      ),
  });

  // Keluar dari formulir yang sudah terisi (menu, tautan, tombol kembali):
  // tanya dulu mau disimpan ke draft atau tidak. Tutup tab / jaringan putus
  // tetap otomatis tersimpan lewat autosave di atas.
  const guard = useLeaveGuard(restored && meaningful && !success && !loading);
  function leaveAndSave() {
    flush("manual");
    guard.confirmLeave();
  }
  function leaveWithoutSaving() {
    finish();
    guard.confirmLeave();
  }

  // Pengiriman gagal (error server / jaringan putus): isian dijadikan draft
  // supaya bisa dilanjutkan, bukan hilang.
  function failAndKeepDraft(message) {
    flush("error");
    fail(`${message} Isian Anda otomatis tersimpan sebagai draft, jadi bisa dilanjutkan.`);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return; // cegah klik ganda / submit ganda saat masih mengirim
    setError("");

    // RAB wajib; nominal diajukan = total RAB (dijaga juga oleh trigger
    // sync_ca_amount_from_rab di DB).
    if (!rabItems.length) {
      fail("RAB wajib diisi minimal satu baris.");
      return;
    }
    const numericAmount = rabTotal(rabItems);
    let rabRows = [];
    try {
      rabRows = toRabRows(rabItems, null).map(
        ({ description, quantity, unit, frequency, unit_price }) => ({
          description,
          quantity,
          unit,
          frequency,
          unit_price,
        })
      );
    } catch (err) {
      fail(err.message);
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      fail("Total RAB harus lebih dari 0.");
      return;
    }

    if (fundingSource === "program" && !programRef.trim()) {
      fail("Masukkan ID campaign atau nama dana program.");
      return;
    }
    if (!agreed) {
      fail("Centang Kebijakan SPJ terlebih dahulu.");
      return;
    }

    setLoading(true);
    let newId;
    try {
      const supabase = createClient();

      // Pengajuan + RAB disimpan sekaligus (atomik) lewat RPC, karena RAB tidak
      // bisa ditulis requester lagi setelah pengajuan berstatus pending.
      const { data, error } = await supabase.rpc("create_cash_advance", {
        ca: {
          purpose,
          fund_usage_date: fundUsageDate,
          funding_source: fundingSource,
          program_ref: fundingSource === "program" ? programRef.trim() : null,
          objective,
          rab_url: rabUrl.trim() || null,
          bank_name: bankName,
          bank_account_number: bankAccountNumber,
          bank_account_holder: bankAccountHolder.trim(),
        },
        rab: rabRows,
      });
      if (error) {
        console.error("Gagal mengajukan Cash Advance:", error);
        setLoading(false);
        failAndKeepDraft(
          `Gagal mengajukan Cash Advance: ${error.message}${error.code ? ` (${error.code})` : ""}.`
        );
        return;
      }
      newId = data;
    } catch (err) {
      console.error("Gagal mengajukan Cash Advance:", err);
      setLoading(false);
      failAndKeepDraft("Pengajuan gagal terkirim (koneksi bermasalah?).");
      return;
    }

    setLoading(false);
    notifyOps(newId);
    finish();
    setSuccess({
      rows: [
        { label: "Nominal pengajuan", value: formatCurrency(numericAmount) },
        { label: "Metode Pencairan", value: `Transfer Bank (${bankName})` },
        { label: "Tanggal Kebutuhan Dana", value: formatDateLong(fundUsageDate) },
      ],
    });
  }

  function handleDone() {
    router.replace("/dashboard");
    router.refresh();
  }

  function handleDraft() {
    const ok = flush("manual");
    setDraftNotice(
      ok
        ? "Draft tersimpan di perangkat ini."
        : "Isi dulu sebagian formulir, atau penyimpanan browser tidak tersedia."
    );
  }

  const notice = savedAt
    ? `Draft tersimpan otomatis pukul ${savedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}.`
    : draftNotice;

  // ── Validasi untuk ringkasan ──
  const total = rabTotal(rabItems);
  const rabFilled =
    rabItems.length > 0 && rabItems.every((it) => it.description?.trim()) && total > 0;
  const sourceOk = Boolean(fundingSource) && (fundingSource !== "program" || programRef.trim());
  const bankOk = Boolean(bankName && bankAccountNumber && bankAccountHolder.trim());
  const checks = [
    { label: "Judul kegiatan diisi", ok: Boolean(purpose.trim()) },
    { label: "Tujuan dipilih", ok: Boolean(objective) },
    { label: "Sumber dana dipilih", ok: Boolean(sourceOk) },
    { label: `RAB terisi (${rabItems.length} baris)`, ok: rabFilled },
    { label: "Tanggal kebutuhan valid", ok: Boolean(fundUsageDate) },
    { label: "Rekening tujuan terisi", ok: bankOk },
    { label: "Kebijakan SPJ disetujui", ok: agreed },
  ];

  return (
    <RequestShell
      onBack={guard.requestBack}
      active="cash_advance"
      summary={
        <ValidationSummary
          kindLabel="Cash Advance"
          kindIcon={Briefcase}
          totalLabel="Total dana diminta"
          total={formatCurrency(total)}
          rows={[
            { label: "Rekening", value: bankOk ? maskedAccount(bankName, bankAccountNumber) : "" },
            { label: "Dibutuhkan", value: fundUsageDate ? formatDateLong(fundUsageDate) : "" },
          ]}
          checks={checks}
          declaration={
            <>
              <strong className="text-[#78350f]">Kebijakan SPJ.</strong> Saya akan mengunggah
              kwitansi dan bukti pengeluaran maksimal{" "}
              <strong className="text-[#78350f]">7 hari kalender</strong> setelah dana cair.
            </>
          }
          agreed={agreed}
          onAgreedChange={setAgreed}
          formId={FORM_ID}
          onDraft={handleDraft}
          loading={loading}
          submitLabel="Mengirim..."
          notice={notice}
        />
      }
    >
      <form
        id={FORM_ID}
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 lg:rounded-3xl lg:p-8"
      >
        {error && (
          <div
            ref={errorRef}
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {error}
          </div>
        )}

        <div data-tour="req-basic" className="space-y-6">
        <Field label="Keperluan / judul kegiatan" required hint={`${purpose.length}/80`} htmlFor="purpose">
          <input
            id="purpose"
            type="text"
            required
            maxLength={80}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className={inputCls}
            placeholder="Contoh: Operasional perjalanan dinas ke Surabaya"
          />
        </Field>

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-4">
          <Field label="Tujuan pengajuan" required htmlFor="objective">
            <SelectField id="objective" required value={objective} onChange={(e) => setObjective(e.target.value)}>
              <option value="" disabled>
                Pilih tujuan
              </option>
              <option value="penyaluran">Penyaluran</option>
              <option value="event">Event</option>
              <option value="lainnya">Lainnya</option>
            </SelectField>
          </Field>
          <Field label="Sumber dana" required htmlFor="funding-source">
            <SelectField
              id="funding-source"
              required
              value={fundingSource}
              onChange={(e) => {
                setFundingSource(e.target.value);
                if (e.target.value !== "program") setProgramRef("");
              }}
            >
              <option value="" disabled>
                Pilih sumber dana
              </option>
              <option value="program">Program</option>
              <option value="marketing_operasional">Marketing / Operasional</option>
              <option value="program_lainnya">Program Lainnya</option>
            </SelectField>
          </Field>
        </div>

        {fundingSource === "program" && (
          <Field label="ID campaign / dana program" required htmlFor="program-ref">
            <input
              id="program-ref"
              type="text"
              required
              value={programRef}
              onChange={(e) => setProgramRef(e.target.value)}
              className={inputCls}
              placeholder="Contoh: CMP-2026-014 atau nama dana program"
            />
          </Field>
        )}
        </div>

        <div data-tour="req-rab">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
            <h2 className="text-base font-bold text-slate-900">
              Rencana Anggaran Biaya (RAB) <span className="text-rose-500">*</span>
            </h2>
            <span className="text-xs text-slate-500">Nominal pengajuan mengikuti total RAB</span>
          </div>
          <RabEditor
            items={rabItems}
            onItemsChange={setRabItems}
            sourceUrl={rabUrl}
            onSourceUrlChange={setRabUrl}
            onImported={({ title }) => setPurpose((prev) => prev || title)}
          />
        </div>

        <div data-tour="req-date" className="grid gap-6 lg:grid-cols-2 lg:gap-4">
          <Field
            label="Tanggal kebutuhan dana"
            required
            htmlFor="fund-date"
            helper={
              fundUsageDate && (
                <p className="mt-2 text-xs text-slate-400">{formatWeekdayDate(fundUsageDate)}</p>
              )
            }
          >
            <input
              id="fund-date"
              type="date"
              required
              value={fundUsageDate}
              onChange={(e) => setFundUsageDate(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <div data-tour="req-bank">
        <BankAccountField
          bankName={bankName}
          onBankName={setBankName}
          accountNumber={bankAccountNumber}
          onAccountNumber={setBankAccountNumber}
          accountHolder={bankAccountHolder}
          onAccountHolder={setBankAccountHolder}
          profileBankMissing={profileBankMissing}
        />
        </div>
      </form>

      <SubmitSuccessModal open={Boolean(success)} rows={success?.rows} onDone={handleDone} />
      <LeaveDialog
        open={guard.pending}
        onSave={leaveAndSave}
        onDiscard={leaveWithoutSaving}
        onCancel={guard.cancelLeave}
      />
      <DraftPrompt
        draft={pendingDraft}
        kindLabel="Cash Advance"
        onContinue={continueDraft}
        onDiscard={discardDraft}
      />
    </RequestShell>
  );
}
