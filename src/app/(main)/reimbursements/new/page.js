"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, FileText, Loader2, ReceiptText, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CurrencyInput from "@/components/CurrencyInput";
import { FilePreviewModal } from "@/components/FilePreview";
import RequestShell from "@/components/request/RequestShell";
import ValidationSummary from "@/components/request/ValidationSummary";
import SubmitSuccessModal from "@/components/request/SubmitSuccessModal";
import BankAccountField from "@/components/request/BankAccountField";
import { Field, SelectField, inputCls, maskedAccount } from "@/components/request/fields";
import { clearDraft, loadDraft, saveDraft } from "@/lib/draft";
import { formatCurrency, formatDateLong, formatDateShort } from "@/lib/utils";
import ReceiptLinesEditor, { newLine, toLinesPayload } from "@/components/ReceiptLinesEditor";
import { renderPdfPreview } from "@/lib/pdfPreview";
import { notifyOps, scanReceiptFile, uploadProof } from "@/lib/receiptScan";
import { toJpegFile } from "@/lib/imageConvert";

const FORM_ID = "new-reimbursement-form";
const DRAFT_KIND = "reimbursement";
const smallInput =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand";

let draftSeq = 0;

export default function NewReimbursementPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [purpose, setPurpose] = useState("");
  const [objective, setObjective] = useState("");
  const [fundingSource, setFundingSource] = useState("");
  const [programRef, setProgramRef] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [profileBankMissing, setProfileBankMissing] = useState(false);

  // Kwitansi yang dilampirkan (belum diunggah sampai pengajuan dikirim).
  const [drafts, setDrafts] = useState([]);
  const [viewingKey, setViewingKey] = useState(null);
  const [preparing, setPreparing] = useState(0);
  const [slowHeic, setSlowHeic] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [success, setSuccess] = useState(null);
  const [draftNotice, setDraftNotice] = useState("");
  const errorRef = useRef(null);

  function fail(message) {
    setError(message);
    requestAnimationFrame(() =>
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    );
  }

  useEffect(() => {
    let active = true;
    (async () => {
      // Pulihkan draft teks (file kwitansi tidak bisa disimpan; lampirkan ulang).
      const draft = loadDraft(DRAFT_KIND);
      if (draft) {
        setPurpose(draft.purpose ?? "");
        setObjective(draft.objective ?? "");
        setFundingSource(draft.fundingSource ?? "");
        setProgramRef(draft.programRef ?? "");
        setBankName(draft.bankName ?? "");
        setBankAccountNumber(draft.bankAccountNumber ?? "");
        setBankAccountHolder(draft.bankAccountHolder ?? "");
        setDraftNotice("Draft sebelumnya dipulihkan. Kwitansi perlu dilampirkan ulang.");
      }
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
      setBankName((prev) => prev || profile.bank_name || "");
      setBankAccountNumber((prev) => prev || profile.bank_account_number || "");
      setBankAccountHolder((prev) => prev || profile.bank_account_holder || "");
      setProfileBankMissing(
        !profile.bank_name || !profile.bank_account_number || !profile.bank_account_holder
      );
    })();
    return () => {
      active = false;
    };
  }, []);

  const updateDraft = (key, patch) =>
    setDrafts((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)));

  async function handleFiles(e) {
    const rawFiles = [...(e.target.files ?? [])];
    e.target.value = "";
    if (!rawFiles.length) return;
    // Foto (termasuk HEIC iPhone) diubah ke JPEG dulu sebelum dipratinjau &
    // diunggah.
    setPreparing((n) => n + rawFiles.length);
    for (const raw of rawFiles) {
      const file = await toJpegFile(raw, { onSlowConversion: () => setSlowHeic(true) });
      setPreparing((n) => n - 1);
      const key = `rb-${++draftSeq}`;
      const isPdf = file.type === "application/pdf";
      setDrafts((list) => [
        ...list,
        {
          key,
          file,
          isPdf,
          previewUrl: URL.createObjectURL(file),
          pdfPages: null,
          scanning: true,
          amount: "",
          vendor: "",
          receiptDate: "",
          lines: [newLine()],
          rawText: "",
        },
      ]);
      scanReceiptFile(file)
        .then((data) =>
          updateDraft(key, {
            scanning: false,
            amount: data.amount ? String(data.amount) : "",
            vendor: data.vendor || "",
            receiptDate: data.receiptDate || "",
            rawText: data.rawText || "",
          })
        )
        .catch(() => updateDraft(key, { scanning: false }));
      if (isPdf) {
        renderPdfPreview(file, { maxPages: 20 })
          .then(({ pages }) => updateDraft(key, { pdfPages: pages }))
          .catch(() => updateDraft(key, { pdfPages: [] }));
      }
    }
    setSlowHeic(false);
  }

  function removeDraft(key) {
    setDrafts((list) => {
      const d = list.find((x) => x.key === key);
      if (d) URL.revokeObjectURL(d.previewUrl);
      return list.filter((x) => x.key !== key);
    });
  }

  const viewing = drafts.find((d) => d.key === viewingKey) ?? null;
  const total = drafts.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!drafts.length) return fail("Lampirkan minimal satu kwitansi.");
    for (const [i, d] of drafts.entries()) {
      if (d.scanning) return fail("Tunggu sampai semua kwitansi selesai dibaca.");
      if (!(Number(d.amount) > 0)) return fail(`Nominal kwitansi ${i + 1} harus lebih dari 0.`);
      try {
        toLinesPayload(d.lines, { kind: "reimbursement", total: d.amount });
      } catch (err) {
        return fail(`Kwitansi ${i + 1}: ${err.message}`);
      }
    }
    if (fundingSource === "program" && !programRef.trim()) {
      return fail("Masukkan ID campaign atau nama dana program.");
    }
    if (!agreed) return fail("Centang pernyataan terlebih dahulu.");

    // Id dibuat di sini supaya file bisa diunggah ke folder Drive pengajuan
    // sebelum barisnya dibuat oleh create_reimbursement.
    const id = crypto.randomUUID();
    try {
      const uploaded = [];
      for (const [i, d] of drafts.entries()) {
        setSubmitting(`Mengunggah kwitansi ${i + 1} dari ${drafts.length}...`);
        const { fileId, viewUrl } = await uploadProof(d.file, {
          cashAdvanceId: id,
          kind: "kwitansi",
          label: `${d.lines[0].pos}${d.lines.length > 1 ? " dll" : ""}`,
          draftPurpose: purpose,
        });
        uploaded.push({
          amount: Number(d.amount),
          vendor: d.vendor,
          receipt_date: d.receiptDate,
          lines: toLinesPayload(d.lines, { kind: "reimbursement", total: d.amount }),
          drive_file_id: fileId,
          drive_view_url: viewUrl,
          ocr_raw_text: d.rawText,
        });
      }

      setSubmitting("Mengirim pengajuan...");
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("create_reimbursement", {
        target_id: id,
        ca: {
          purpose,
          objective,
          funding_source: fundingSource,
          program_ref: fundingSource === "program" ? programRef.trim() : null,
          bank_name: bankName,
          bank_account_number: bankAccountNumber,
          bank_account_holder: bankAccountHolder.trim(),
        },
        receipts: uploaded,
      });
      if (rpcError) throw new Error(rpcError.message);

      notifyOps(id);
      clearDraft(DRAFT_KIND);
      setSubmitting("");
      setSuccess({
        id,
        rows: [
          { label: "Total klaim", value: formatCurrency(total) },
          { label: "Jumlah kwitansi", value: String(drafts.length) },
          { label: "Metode Pembayaran", value: `Transfer Bank (${bankName})` },
        ],
      });
    } catch (err) {
      fail(`Gagal mengajukan reimbursement: ${err.message}`);
      setSubmitting("");
    }
  }

  function handleDone() {
    router.replace("/dashboard");
    router.refresh();
  }

  function handleDraft() {
    const ok = saveDraft(DRAFT_KIND, {
      purpose,
      objective,
      fundingSource,
      programRef,
      bankName,
      bankAccountNumber,
      bankAccountHolder,
    });
    setDraftNotice(
      ok
        ? "Draft tersimpan di perangkat ini (kwitansi tidak ikut tersimpan)."
        : "Draft gagal disimpan (penyimpanan browser tidak tersedia)."
    );
  }

  // ── Validasi untuk ringkasan ──
  const receiptsReady =
    drafts.length > 0 && drafts.every((d) => !d.scanning && Number(d.amount) > 0);
  const bankOk = Boolean(bankName && bankAccountNumber && bankAccountHolder.trim());
  const sourceOk = Boolean(fundingSource) && (fundingSource !== "program" || programRef.trim());
  const latestReceiptDate = drafts.map((d) => d.receiptDate).filter(Boolean).sort().at(-1);
  const checks = [
    { label: "Keperluan diisi", ok: Boolean(purpose.trim()) },
    { label: "Tujuan dan sumber dana dipilih", ok: Boolean(objective) && Boolean(sourceOk) },
    { label: `Kwitansi terlampir (${drafts.length})`, ok: drafts.length > 0 },
    { label: "Total sesuai kwitansi", ok: receiptsReady },
    { label: "Rekening tujuan terisi", ok: bankOk },
    { label: "Pernyataan disetujui", ok: agreed },
  ];

  return (
    <RequestShell
      active="reimbursement"
      summary={
        <ValidationSummary
          kindLabel="Reimbursement"
          kindIcon={ReceiptText}
          totalLabel="Total klaim"
          total={formatCurrency(total)}
          rows={[
            { label: "Jumlah kwitansi", value: String(drafts.length) },
            { label: "Rekening", value: bankOk ? maskedAccount(bankName, bankAccountNumber) : "" },
            { label: "Tgl transaksi", value: latestReceiptDate ? formatDateLong(latestReceiptDate) : "" },
          ]}
          checks={checks}
          declaration={
            <>
              <strong className="text-[#78350f]">Pernyataan.</strong> Saya menyatakan kwitansi yang
              dilampirkan asli dan sesuai dengan transaksi yang saya bayarkan.
            </>
          }
          agreed={agreed}
          onAgreedChange={setAgreed}
          formId={FORM_ID}
          onDraft={handleDraft}
          loading={Boolean(submitting)}
          submitLabel={submitting || "Kirim Pengajuan"}
          notice={draftNotice}
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

        <Field label="Keperluan / judul kegiatan" required hint={`${purpose.length}/80`} htmlFor="purpose">
          <input
            id="purpose"
            type="text"
            required
            maxLength={80}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className={inputCls}
            placeholder="Contoh: Survei lokasi penyaluran Garut"
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

        <div>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 border-b border-slate-900/80 pb-3 lg:border-0 lg:pb-0">
            <h2 className="text-base font-bold text-slate-900">
              Kwitansi &amp; Bukti Transfer ({drafts.length}) <span className="text-rose-500">*</span>
            </h2>
            <span className="hidden text-xs text-slate-500 lg:inline">Total klaim dihitung dari kwitansi</span>
          </div>
          <div className="space-y-3">
            {drafts.map((d, i) => (
              <div key={d.key} className="rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center gap-3 p-3 lg:p-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <FileText size={20} strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">
                      {d.vendor || `Kwitansi ${i + 1}`}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {d.receiptDate ? formatDateShort(d.receiptDate) : d.file.name}
                    </p>
                    {d.scanning ? (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <Loader2 size={12} className="animate-spin" /> Membaca dokumen...
                      </p>
                    ) : (
                      d.rawText && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <Check size={12} strokeWidth={3} /> Terpindai otomatis
                        </p>
                      )
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-slate-900">
                      {d.amount ? formatCurrency(d.amount) : "-"}
                    </p>
                    <button
                      type="button"
                      onClick={() => setViewingKey(d.key)}
                      className="text-xs font-semibold text-brand hover:underline"
                    >
                      Lihat foto
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDraft(d.key)}
                    className="shrink-0 p-1.5 text-slate-400 hover:text-rose-600"
                    aria-label={`Hapus kwitansi ${i + 1}`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                {!d.scanning && (
                  <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 p-3 lg:p-4">
                    <CurrencyInput
                      required
                      value={d.amount}
                      onValueChange={(v) => updateDraft(d.key, { amount: v })}
                      className={smallInput}
                      placeholder="Nominal kwitansi"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={d.vendor}
                        onChange={(e) => updateDraft(d.key, { vendor: e.target.value })}
                        className={smallInput}
                        placeholder="Toko / penerima transfer"
                      />
                      <input
                        type="date"
                        value={d.receiptDate}
                        onChange={(e) => updateDraft(d.key, { receiptDate: e.target.value })}
                        className={smallInput}
                      />
                      <div className="col-span-2">
                        <ReceiptLinesEditor
                          kind="reimbursement"
                          lines={d.lines}
                          onChange={(lines) => updateDraft(d.key, { lines })}
                          total={d.amount}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 py-4 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand"
            >
              <Camera size={18} /> Tambah Kwitansi / Bukti Transfer
              <span className="hidden font-normal text-slate-500 lg:inline">Foto, unggah, atau isi manual</span>
            </button>
            {preparing > 0 && (
              <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
                <Loader2 size={14} className="animate-spin" /> Menyiapkan {preparing} foto...
                {slowHeic && " (foto iPhone/HEIC, bisa sampai 1 menit per foto)"}
              </p>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif,application/pdf"
              multiple
              onChange={handleFiles}
              className="hidden"
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-[#f1f5f9] px-5 py-4">
          <span className="text-sm text-slate-600">Total Reimbursement</span>
          <span className="text-lg font-bold text-slate-900">{formatCurrency(total)}</span>
        </div>

        <BankAccountField
          bankName={bankName}
          onBankName={setBankName}
          accountNumber={bankAccountNumber}
          onAccountNumber={setBankAccountNumber}
          accountHolder={bankAccountHolder}
          onAccountHolder={setBankAccountHolder}
          profileBankMissing={profileBankMissing}
        />
      </form>

      <FilePreviewModal
        open={Boolean(viewing)}
        onClose={() => setViewingKey(null)}
        title={viewing?.file.name}
        images={
          viewing
            ? viewing.isPdf
              ? viewing.pdfPages ?? []
              : [viewing.previewUrl]
            : []
        }
        loading={viewing?.isPdf && !viewing.pdfPages}
        fallbackUrl={viewing?.previewUrl}
      />

      <SubmitSuccessModal open={Boolean(success)} rows={success?.rows} onDone={handleDone} />
    </RequestShell>
  );
}
