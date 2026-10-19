"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Eye, FileText, Info, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CurrencyInput from "@/components/CurrencyInput";
import BankInput from "@/components/BankInput";
import KindSwitch from "@/components/KindSwitch";
import { FilePreviewModal } from "@/components/FilePreview";
import { formatCurrency } from "@/lib/utils";
import ReceiptLinesEditor, { newLine, toLinesPayload } from "@/components/ReceiptLinesEditor";
import { renderPdfPreview } from "@/lib/pdfPreview";
import { notifyOps, scanReceiptFile, uploadProof } from "@/lib/receiptScan";
import { toJpegFile } from "@/lib/imageConvert";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand";
const smallInput =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand";

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

    if (!drafts.length) return setError("Lampirkan minimal satu kwitansi.");
    for (const [i, d] of drafts.entries()) {
      if (d.scanning) return setError("Tunggu sampai semua kwitansi selesai dibaca.");
      if (!(Number(d.amount) > 0)) return setError(`Nominal kwitansi ${i + 1} harus lebih dari 0.`);
      try {
        toLinesPayload(d.lines, { kind: "reimbursement", total: d.amount });
      } catch (err) {
        return setError(`Kwitansi ${i + 1}: ${err.message}`);
      }
    }
    if (fundingSource === "program" && !programRef.trim()) {
      return setError("Masukkan ID campaign atau nama dana program.");
    }

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
      router.replace(`/cash-advances/${id}`);
      router.refresh();
    } catch (err) {
      setError(`Gagal mengajukan reimbursement: ${err.message}`);
      setSubmitting("");
    }
  }

  return (
    <div className="space-y-4 lg:max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 lg:text-2xl lg:font-bold">Ajukan Reimbursement</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Klaim penggantian uang pribadi yang sudah terpakai. Lampirkan semua
          kwitansinya.
        </p>
      </div>

      <KindSwitch active="reimbursement" />

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 lg:rounded-3xl lg:p-6"
      >
        {error && (
          <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Keperluan</label>
          <textarea
            required
            rows={2}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className={inputClass}
            placeholder="Contoh: Survei lokasi penyaluran Garut"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tujuan</label>
            <select
              required
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className={`${inputClass} bg-white`}
            >
              <option value="" disabled>
                Pilih tujuan
              </option>
              <option value="penyaluran">Penyaluran</option>
              <option value="event">Event</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sumber Dana</label>
            <select
              required
              value={fundingSource}
              onChange={(e) => {
                setFundingSource(e.target.value);
                if (e.target.value !== "program") setProgramRef("");
              }}
              className={`${inputClass} bg-white`}
            >
              <option value="" disabled>
                Pilih sumber dana
              </option>
              <option value="program">Program</option>
              <option value="marketing_operasional">Marketing / Operasional</option>
              <option value="program_lainnya">Program Lainnya</option>
            </select>
          </div>
        </div>

        {fundingSource === "program" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              ID Campaign / Dana Program
            </label>
            <input
              type="text"
              required
              value={programRef}
              onChange={(e) => setProgramRef(e.target.value)}
              className={inputClass}
              placeholder="Contoh: CMP-2026-014 atau nama dana program"
            />
          </div>
        )}

        <div>
          <p className="block text-sm font-medium text-slate-700 mb-1">
            Kwitansi &amp; Bukti Transfer ({drafts.length})
          </p>
          <div className="space-y-3">
            {drafts.map((d, i) => (
              <div key={d.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-slate-500">Kwitansi {i + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeDraft(d.key)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                    aria-label={`Hapus kwitansi ${i + 1}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Pratinjau besar langsung; klik untuk layar penuh. */}
                <button
                  type="button"
                  onClick={() => setViewingKey(d.key)}
                  className="relative block w-full overflow-hidden rounded-lg border border-slate-200 bg-white"
                  aria-label={`Lihat kwitansi ${i + 1} layar penuh`}
                >
                  {d.isPdf ? (
                    d.pdfPages?.length ? (
                      <div className="max-h-96 overflow-y-auto space-y-2 bg-slate-100 p-2">
                        {d.pdfPages.map((src, p) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={p} src={src} alt={`Halaman ${p + 1}`} className="w-full bg-white" />
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-40 flex-col items-center justify-center gap-2 text-slate-400">
                        {d.pdfPages ? <FileText size={28} /> : <Loader2 size={24} className="animate-spin" />}
                        <span className="text-xs">
                          {d.pdfPages ? `${d.file.name} (pratinjau tidak tersedia)` : "Menyiapkan pratinjau PDF..."}
                        </span>
                      </div>
                    )
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.previewUrl} alt={`Kwitansi ${i + 1}`} className="mx-auto max-h-96 w-full object-contain" />
                  )}
                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm">
                    <Eye size={12} /> Layar penuh
                  </span>
                </button>

                {d.scanning ? (
                  <p className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Loader2 size={14} className="animate-spin" /> Membaca dokumen...
                  </p>
                ) : (
                  <CurrencyInput
                    required
                    value={d.amount}
                    onValueChange={(v) => updateDraft(d.key, { amount: v })}
                    className={smallInput}
                    placeholder="Nominal kwitansi"
                  />
                )}
                {!d.scanning && (
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
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl py-4 text-sm font-medium text-slate-600 hover:border-brand hover:text-brand"
            >
              <Camera size={18} /> Tambah Kwitansi / Bukti Transfer
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

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Total Reimbursement
          </label>
          <p className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold text-slate-900">
            {formatCurrency(total)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Jumlah semua kwitansi.</p>
        </div>

        {profileBankMissing && (
          <div className="flex gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-800">
            <Info size={16} className="shrink-0 mt-0.5" />
            <p>
              Rekening default Anda belum lengkap di{" "}
              <Link href="/profile" className="font-semibold underline">
                Pengaturan
              </Link>
              . Isi di sana supaya terisi otomatis setiap mengajukan. Untuk
              pengajuan ini, isi langsung di bawah.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Bank Tujuan Transfer
          </label>
          <BankInput required value={bankName} onChange={setBankName} className={inputClass} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nomor Rekening</label>
          <input
            type="text"
            required
            inputMode="numeric"
            value={bankAccountNumber}
            onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ""))}
            className={inputClass}
            placeholder="Nomor rekening penerima"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Atas Nama Rekening
          </label>
          <input
            type="text"
            required
            value={bankAccountHolder}
            onChange={(e) => setBankAccountHolder(e.target.value)}
            className={inputClass}
            placeholder="Nama pemilik rekening sesuai buku tabungan"
          />
        </div>

        <button
          type="submit"
          disabled={Boolean(submitting)}
          className="w-full bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-medium rounded-lg py-2.5 transition-colors lg:rounded-full lg:bg-dark-navy lg:font-semibold lg:hover:bg-slate-800"
        >
          {submitting || "Kirim Pengajuan"}
        </button>
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
    </div>
  );
}
