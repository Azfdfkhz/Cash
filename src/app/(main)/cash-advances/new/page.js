"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Briefcase, Check } from "lucide-react";
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

// Tanggal hari ini menurut WIB (bukan UTC) — kalau pakai toISOString(), antara
// 00.00–07.00 WIB batas minimal tanggal masih menunjukkan hari kemarin.
function todayJakarta() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

// Pengelompokan isian supaya formulir panjang tetap mudah dipindai.
function Section({ id, title, description, className = "", children }) {
  return (
    <section aria-labelledby={id} className={`space-y-5 ${className}`}>
      <div>
        <h2 id={id} className="text-base font-bold text-slate-900">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

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
  // Pesan singkat yang muncul dekat tombol (di mobile kartu ringkasan jauh di
  // bawah, jadi konfirmasi simpan draft harus tampil di area yang terlihat).
  const [toast, setToast] = useState(null);
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
    const d = loadDraft(DRAFT_KIND);
    if (d) setPendingDraft(d);
    else setRestored(true);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

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
    setToast({ tone: "ok", text: "Draft dilanjutkan. Lengkapi isian, lalu kirim." });
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
    // Cegah pengiriman ganda (mis. Enter ditekan dua kali sebelum tombol disable).
    if (loading) return;
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
    setToast(
      ok
        ? {
            tone: "ok",
            text: "Draft tersimpan di perangkat ini. Anda bisa melanjutkannya kapan saja.",
          }
        : { tone: "error", text: "Isi dulu sebagian formulir sebelum menyimpan draft." }
    );
  }

  const notice = savedAt
    ? `Draft tersimpan otomatis pukul ${savedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}.`
    : "";

  // ── Validasi untuk ringkasan ──
  // Aturan sama dengan yang dipakai saat kirim: uraian wajib, jumlah &
  // frekuensi > 0, dan total RAB > 0.
  const total = rabTotal(rabItems);
  const rabRowsValid =
    rabItems.length > 0 &&
    rabItems.every(
      (it) => it.description?.trim() && Number(it.quantity) > 0 && Number(it.frequency) > 0
    );
  const rabFilled = rabRowsValid && total > 0;
  const sourceOk = Boolean(fundingSource) && (fundingSource !== "program" || programRef.trim());
  const bankOk = Boolean(bankName && bankAccountNumber && bankAccountHolder.trim());
  // `target` = id elemen yang dituju saat poin diklik (lihat ValidationSummary).
  const checks = [
    { label: "Judul kegiatan diisi", ok: Boolean(purpose.trim()), target: "purpose" },
    { label: "Jenis kegiatan dipilih", ok: Boolean(objective), target: "objective" },
    {
      label: "Sumber dana dipilih",
      ok: Boolean(sourceOk),
      target: fundingSource === "program" ? "program-ref" : "funding-source",
    },
    {
      label: rabItems.length > 1 ? `RAB terisi (${rabItems.length} baris)` : "RAB terisi",
      ok: rabFilled,
      target: "rab-editor",
    },
    {
      label: "Tanggal kebutuhan dana diisi",
      ok: Boolean(fundUsageDate),
      target: "fund-date",
    },
    { label: "Rekening tujuan terisi", ok: bankOk, target: "bank-account" },
    {
      label: "Kebijakan SPJ disetujui",
      ok: agreed,
      target: "spj-declaration",
      isDeclaration: true,
    },
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
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {error}
          </div>
        )}

        <Section id="section-info" title="Informasi pengajuan">
          <Field
            label="Judul kegiatan"
            required
            hint={`${purpose.length}/80`}
            htmlFor="purpose"
            helper={
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Dipakai sebagai nama pengajuan di daftar, laporan, dan notifikasi.
              </p>
            }
          >
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
            <Field
              label="Jenis kegiatan"
              required
              htmlFor="objective"
              helper={
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  Menentukan kategori laporan. Pilih &quot;Lainnya&quot; jika kegiatan bukan
                  penyaluran atau event.
                </p>
              }
            >
              <SelectField
                id="objective"
                required
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
              >
                <option value="" disabled>
                  Pilih jenis kegiatan
                </option>
                <option value="penyaluran">Penyaluran</option>
                <option value="event">Event</option>
                <option value="lainnya">Lainnya</option>
              </SelectField>
            </Field>
            <Field
              label="Sumber dana"
              required
              htmlFor="funding-source"
              helper={
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {!fundingSource && "Pilih dana yang menanggung pengeluaran ini."}
                  {fundingSource === "program" &&
                    "Dana dari campaign yang sudah terdaftar. ID campaign wajib diisi di bawah."}
                  {fundingSource === "program_lainnya" &&
                    "Kegiatan program di luar campaign terdaftar — tanpa ID campaign."}
                  {fundingSource === "marketing_operasional" &&
                    "Dana rutin non-program untuk pemasaran atau operasional harian."}
                </p>
              }
            >
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
            <Field
              label="ID campaign / dana program"
              required
              htmlFor="program-ref"
              helper={
                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  ID campaign tertera di halaman detail campaign (contoh:{" "}
                  <span className="font-mono">CMP-2026-014</span>). Tidak tahu ID-nya? Tuliskan saja
                  nama dananya, mis. &quot;Dana Beasiswa Semester Ganjil&quot;.
                </p>
              }
            >
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
        </Section>

        <Section
          id="section-rab"
          className="border-t border-slate-100 pt-6"
          title={
            <>
              Rencana Anggaran Biaya (RAB) <span className="text-rose-500">*</span>
            </>
          }
          description="Nominal pengajuan dihitung otomatis dari total RAB — tidak ada kolom nominal terpisah."
        >
          <div id="rab-editor">
            <RabEditor
              items={rabItems}
              onItemsChange={setRabItems}
              sourceUrl={rabUrl}
              onSourceUrlChange={setRabUrl}
              onImported={({ title }) => setPurpose((prev) => prev || title)}
            />
          </div>
        </Section>

        <Section
          id="section-pencairan"
          className="border-t border-slate-100 pt-6"
          title="Jadwal & pencairan dana"
          description="Kapan dana dibutuhkan dan ke rekening mana dana dikirim."
        >
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-4">
            <Field
              label="Tanggal kebutuhan dana"
              required
              htmlFor="fund-date"
              helper={
                fundUsageDate ? (
                  <p className="mt-2 text-xs text-slate-400">
                    {formatWeekdayDate(fundUsageDate)} — paling cepat hari ini, supaya tim punya
                    waktu memproses pencairan.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">
                    Tanggal dana akan dipakai — bukan tanggal pengajuan ini.
                  </p>
                )
              }
            >
              <input
                id="fund-date"
                type="date"
                required
                min={todayJakarta()}
                value={fundUsageDate}
                onChange={(e) => setFundUsageDate(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <div id="bank-account">
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
        </Section>
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

      {toast && (
        <div
          role="status"
          className={`animate-fade-in fixed inset-x-4 bottom-32 z-40 mx-auto flex max-w-sm items-start gap-2 rounded-xl px-4 py-3 text-sm shadow-[0_12px_32px_-8px_rgba(15,23,42,0.45)] lg:bottom-8 ${
            toast.tone === "error" ? "bg-rose-600 text-white" : "bg-slate-900 text-white"
          }`}
        >
          {toast.tone === "error" ? (
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
          ) : (
            <Check size={16} className="mt-0.5 shrink-0" />
          )}
          <span className="leading-relaxed">{toast.text}</span>
        </div>
      )}
    </RequestShell>
  );
}
