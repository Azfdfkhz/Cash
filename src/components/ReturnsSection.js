"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowDownToLine, Check, CheckCircle2, Copy, Download, Eye, FileText, Hourglass, Landmark, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import CurrencyInput from "@/components/CurrencyInput";
import { DriveInlinePreview, FilePreviewLink, LocalFilePreview } from "@/components/FilePreview";
import {
  formatCurrency,
  formatDate,
  toCsvValue,
  downloadCsv,
  COMPANY_RETURN_ACCOUNTS,
} from "@/lib/utils";
import { compareRab, describeReceiptLines, receiptLines } from "@/lib/rab";
import { toJpegFile } from "@/lib/imageConvert";
import DateInput from "@/components/request/DateInput";
import { assertNotTimedOut, createRequestTimer, TIMEOUT_MESSAGE, toTimeoutError } from "@/lib/requestTimeout";

// Nomor langkah kecil di judul tiap bagian formulir pengembalian.
function StepLabel({ n, children, htmlFor, optional = false }) {
  return (
    <label htmlFor={htmlFor} className="flex items-center gap-2 text-sm font-bold text-slate-900">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
        {n}
      </span>
      <span>
        {children}
        {optional && <span className="ml-1 font-normal text-slate-600">(Opsional)</span>}
      </span>
    </label>
  );
}

// Rekening perusahaan tempat requester mentransfer, dicari dari nomor yang tersimpan.
function findCompanyAccount(number) {
  return COMPANY_RETURN_ACCOUNTS.find((a) => a.number === number) ?? null;
}

async function downloadClosureReport(supabase, cashAdvanceId) {
  const { data: ca } = await supabase
    .from("cash_advances")
    .select("*, profiles:requester_id(full_name)")
    .eq("id", cashAdvanceId)
    .single();

  const { data: receipts } = await supabase
    .from("receipts")
    .select("*, receipt_lines(*)")
    .eq("cash_advance_id", cashAdvanceId)
    .order("created_at", { ascending: true });

  const { data: returns } = await supabase
    .from("cash_advance_returns")
    .select("*, confirmedBy:confirmed_by(full_name)")
    .eq("cash_advance_id", cashAdvanceId)
    .order("created_at", { ascending: true });

  const { data: reimbursements } = await supabase
    .from("cash_advance_reimbursements")
    .select("*, createdBy:created_by(full_name)")
    .eq("cash_advance_id", cashAdvanceId)
    .order("created_at", { ascending: true });

  const { data: rabItems } = await supabase
    .from("rab_items")
    .select("*")
    .eq("cash_advance_id", cashAdvanceId)
    .order("position");
  const rab = compareRab(rabItems ?? [], receipts ?? []);

  const totalSpent = (receipts ?? []).reduce(
    (sum, r) => sum + Number(r.amount || 0),
    0
  );
  const totalReturned = (returns ?? [])
    .filter((r) => r.confirmed_at)
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalReimbursed = (reimbursements ?? []).reduce(
    (sum, r) => sum + Number(r.amount || 0),
    0
  );

  const lines = [
    `Laporan Cash Advance - ${toCsvValue(ca.purpose)}`,
    `Requester,${toCsvValue(ca.profiles?.full_name)}`,
    `Nominal Diajukan,${ca.amount_requested}`,
    "",
    ...(rab.rows.length
      ? [
          "PERBANDINGAN RAB VS REALISASI",
          ["No", "Uraian", "Jumlah", "Satuan", "Frekuensi", "Harga Satuan", "Total RAB", "Volume RAB", "Volume Realisasi", "Realisasi", "Sisa"].join(","),
          ...rab.rows.map(({ item, budget, realized, remaining, volume, usedVolume }, i) =>
            [
              i + 1,
              item.description,
              item.quantity,
              item.unit,
              item.frequency,
              item.unit_price,
              budget,
              volume,
              usedVolume,
              realized,
              remaining,
            ]
              .map(toCsvValue)
              .join(",")
          ),
          ...(rab.outside.length
            ? [["", "Di luar RAB (tak terduga)", "", "", "", "", 0, "", rab.outside.reduce((s, r) => s + Number(r.quantity ?? 1), 0), rab.outsideTotal, -rab.outsideTotal].map(toCsvValue).join(",")]
            : []),
          ...(rab.unassigned.length
            ? [["", "Kwitansi tanpa pos RAB", "", "", "", "", "", "", "", rab.unassignedTotal, -rab.unassignedTotal].map(toCsvValue).join(",")]
            : []),
          ["Total", "", "", "", "", "", rab.totalBudget, "", "", rab.totalRealized, rab.totalRemaining].map(toCsvValue).join(","),
          "",
        ]
      : []),
    "KWITANSI REALISASI",
    ["Tanggal", "Pos RAB / Kategori", "Vendor", "Volume", "Nominal", "Catatan", "Link Foto"].join(","),
    ...(receipts ?? []).map((r) =>
      [
        r.receipt_date ? formatDate(r.receipt_date) : "-",
        describeReceiptLines(r, { items: rabItems ?? [], formatCurrency }),
        r.vendor,
        receiptLines(r).reduce((s, l) => s + Number(l.quantity ?? 1), 0),
        r.amount,
        [r.notes, ...receiptLines(r).map((l) => l.notes)].filter(Boolean).join("; "),
        r.drive_view_url,
      ]
        .map(toCsvValue)
        .join(",")
    ),
    "",
    "DETAIL PENGEMBALIAN",
    ["Tanggal", "Nominal", "Catatan", "Dikonfirmasi Oleh", "Bukti Transfer"].join(
      ","
    ),
    ...(returns ?? []).map((r) =>
      [
        formatDate(r.created_at),
        r.amount,
        r.note,
        r.confirmedBy?.full_name || "-",
        r.proof_drive_view_url,
      ]
        .map(toCsvValue)
        .join(",")
    ),
    "",
    "PENGGANTIAN KELEBIHAN BELANJA",
    ["Tanggal", "Nominal", "Catatan", "Dicatat Oleh", "Bukti Transfer"].join(
      ","
    ),
    ...(reimbursements ?? []).map((r) =>
      [
        formatDate(r.created_at),
        r.amount,
        r.note,
        r.createdBy?.full_name || "-",
        r.proof_drive_view_url,
      ]
        .map(toCsvValue)
        .join(",")
    ),
    "",
    `Total Terpakai,${totalSpent}`,
    `Total Dikembalikan,${totalReturned}`,
    `Total Diganti Perusahaan,${totalReimbursed}`,
  ];

  downloadCsv(`laporan-ca-${cashAdvanceId.slice(0, 8)}.csv`, lines);
}

export default function ReturnsSection({
  cashAdvanceId,
  status,
  isOwner,
  isOperational,
  balance,
  totalReturned,
  returns,
  totalReimbursed,
  reimbursements,
  reportUrl,
  bankName,
  bankAccountNumber,
  bankAccountHolder,
  kind,
  // false = dana belum dicairkan: belum ada sisa saldo yang bisa dikembalikan.
  disbursed = true,
  amountRequested = 0,
  totalSpent = 0,
  // Dipanggil setelah pengembalian tersimpan (dipakai ReturnPopup untuk
  // menampilkan status pengembalian).
  onReturnSubmitted,
  // Dipanggil true/false selama bukti pengembalian dikirim (pop up menampilkan loading).
  onSubmittingChange,
}) {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const initialRemaining = balance - totalReturned;
  const [amount, setAmount] = useState(initialRemaining > 0 ? String(initialRemaining) : "");
  const [returnDate, setReturnDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [copiedAcc, setCopiedAcc] = useState(null);
  // Rekening perusahaan yang dipilih requester (otomatis terpilih saat menekan
  // Salin). Disimpan bersama pengembalian agar Operasional tahu mana yang dicek.
  const [selectedAcc, setSelectedAcc] = useState(null);
  const [accError, setAccError] = useState("");
  const accBoxRef = useRef(null);
  // ID pengembalian dibuat di sisi klien dan dipakai ulang saat klik ulang,
  // jadi pengiriman yang sempat time out tidak tercatat dobel.
  const attemptIdRef = useRef(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmingId, setConfirmingId] = useState(null);
  const [closing, setClosing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState("");
  // Bukti belum dilampirkan: pesan tampil tepat di bawah kotak unggah.
  const [proofError, setProofError] = useState("");
  const [reimburseProofError, setReimburseProofError] = useState("");
  const proofBoxRef = useRef(null);
  const reimburseBoxRef = useRef(null);
  // Konfirmasi dua langkah untuk aksi pada baris pengembalian: { id, type }.
  const [rowAction, setRowAction] = useState(null);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    onSubmittingChange?.(submitting);
  }, [submitting, onSubmittingChange]);

  // Bila komponen terlepas di tengah pengiriman, jangan tinggalkan overlay
  // "Mengirim..." menyala di induknya.
  const onSubmittingChangeRef = useRef(onSubmittingChange);
  onSubmittingChangeRef.current = onSubmittingChange;
  useEffect(() => () => onSubmittingChangeRef.current?.(false), []);

  const reimburseFileInputRef = useRef(null);
  const [reimburseFile, setReimburseFile] = useState(null);
  const deficit = Math.abs(Math.min(balance, 0)) - totalReimbursed;
  const [reimburseAmount, setReimburseAmount] = useState(
    deficit > 0 ? String(deficit) : ""
  );
  const [reimburseNote, setReimburseNote] = useState("");
  const [reimbursing, setReimbursing] = useState(false);
  // Ref sinkron per aksi: cegah klik ganda super cepat (sebelum state
  // `submitting`/`reimbursing`/dst. membuat tombol disabled) memicu
  // pengiriman atau konfirmasi dua kali untuk aksi finansial yang sama.
  const submitBusyRef = useRef(false);
  const reimburseBusyRef = useRef(false);
  const reimburseAttemptIdRef = useRef(null);
  const closeBusyRef = useRef(false);
  const confirmBusyRef = useRef(false);

  const remaining = disbursed ? balance - totalReturned : 0;
  // Reimbursement tidak punya sisa/kekurangan: selesai lewat transfer
  // reimbursement (DisbursementSection), jadi form-form ini tidak berlaku.
  const isCashAdvance = kind !== "reimbursement";
  const showReturnForm =
    isCashAdvance && isOwner && status === "approved" && remaining > 0;
  const showReimburseForm =
    isCashAdvance && isOperational && status === "approved" && balance < 0 && deficit > 0;
  const showDirectClose =
    isCashAdvance && isOperational && status === "approved" && balance === 0;

  async function handleSubmitReturn(e) {
    e.preventDefault();
    if (submitBusyRef.current) return;
    setError("");
    setProofError("");

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError("Nominal pengembalian harus lebih dari 0.");
      return;
    }
    if (numericAmount > Math.max(remaining, 0)) {
      setError("Nominal melebihi sisa saldo yang perlu dikembalikan.");
      return;
    }
    const account = findCompanyAccount(selectedAcc);
    if (!account) {
      setAccError("Pilih rekening tujuan dulu: tekan Salin pada rekening yang Anda pakai untuk transfer.");
      accBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!file) {
      setProofError("Bukti transfer belum dilampirkan. Unggah foto atau PDF bukti transfer dulu, lalu kirim lagi.");
      proofBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    submitBusyRef.current = true;
    setSubmitting(true);
    // Lebih dari 15 detik belum terkirim -> hentikan dan minta klik ulang.
    const timer = createRequestTimer();
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("cashAdvanceId", cashAdvanceId);
      formData.append("kind", "bukti-pengembalian");

      const uploadRes = await fetch("/api/drive/upload", {
        method: "POST",
        body: formData,
        signal: timer.signal,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!attemptIdRef.current) attemptIdRef.current = crypto.randomUUID();
      const row = {
        id: attemptIdRef.current,
        cash_advance_id: cashAdvanceId,
        created_by: user.id,
        amount: numericAmount,
        note: note || null,
        return_date: returnDate || null,
        proof_drive_file_id: uploadData.fileId,
        proof_drive_view_url: uploadData.viewUrl,
        dest_bank: account.bank,
        dest_account_number: account.number,
      };
      let { error: insertError } = await supabase
        .from("cash_advance_returns")
        .insert(row)
        .abortSignal(timer.signal);
      assertNotTimedOut(timer);

      // Database lama (migrasi 0040 belum dijalankan) belum punya kolom
      // rekening tujuan: simpan infonya di catatan agar Operasional tetap tahu.
      if (insertError?.code === "42703" || insertError?.code === "PGRST204") {
        const { dest_bank, dest_account_number, ...base } = row;
        const tag = `[Transfer ke ${dest_bank} ${dest_account_number}]`;
        ({ error: insertError } = await supabase
          .from("cash_advance_returns")
          .insert({ ...base, note: note ? `${tag} ${note}` : tag })
          .abortSignal(timer.signal));
        assertNotTimedOut(timer);
      }
      // 23505 pada id = klik ulang setelah kiriman sebelumnya sebenarnya sudah masuk.
      if (insertError && insertError.code !== "23505") throw new Error(insertError.message);
      timer.clear();

      onReturnSubmitted?.({
        amount: numericAmount,
        note,
        file,
        viewUrl: uploadData.viewUrl,
        submittedAt: new Date().toISOString(),
        destBank: account.bank,
        destAccountNumber: account.number,
        destAccountHolder: account.holder,
      });
      attemptIdRef.current = null;
      setFile(null);
      setNote("");
      router.refresh();
    } catch (err) {
      timer.clear();
      const e2 = toTimeoutError(err, timer);
      setError(e2.message || "Gagal menyimpan pengembalian. Coba lagi.");
      submitBusyRef.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmitReimbursement(e) {
    e.preventDefault();
    if (reimburseBusyRef.current) return;
    setError("");
    setReimburseProofError("");

    const numericAmount = Number(reimburseAmount);
    if (!numericAmount || numericAmount <= 0) {
      setError("Nominal penggantian harus lebih dari 0.");
      return;
    }
    if (!reimburseFile) {
      setReimburseProofError("Bukti transfer belum dilampirkan. Unggah foto bukti transfer dulu, lalu simpan lagi.");
      reimburseBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    reimburseBusyRef.current = true;
    setReimbursing(true);
    const timer = createRequestTimer(); // >15 detik belum terkirim -> klik ulang
    try {
      const formData = new FormData();
      formData.append("file", reimburseFile);
      formData.append("cashAdvanceId", cashAdvanceId);
      formData.append("kind", "bukti-penggantian");

      const uploadRes = await fetch("/api/drive/upload", {
        method: "POST",
        body: formData,
        signal: timer.signal,
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error);

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!reimburseAttemptIdRef.current) reimburseAttemptIdRef.current = crypto.randomUUID();
      const { data: insertedRow, error: insertErr } = await supabase
        .from("cash_advance_reimbursements")
        .insert({
          id: reimburseAttemptIdRef.current,
          cash_advance_id: cashAdvanceId,
          created_by: user.id,
          amount: numericAmount,
          note: reimburseNote || null,
          proof_drive_file_id: uploadData.fileId,
          proof_drive_view_url: uploadData.viewUrl,
        })
        .select("id")
        .single()
        .abortSignal(timer.signal);
      assertNotTimedOut(timer);
      // 23505 pada id = klik ulang setelah kiriman sebelumnya sebenarnya sudah masuk.
      if (insertErr && insertErr.code !== "23505") throw new Error(insertErr.message);
      timer.clear();
      const inserted = insertedRow ?? { id: reimburseAttemptIdRef.current };
      reimburseAttemptIdRef.current = null;

      const { data: updatedCa } = await supabase
        .from("cash_advances")
        .select("status")
        .eq("id", cashAdvanceId)
        .single();

      // Notifikasi dikirim setelah status terbaru terbaca, supaya pesannya
      // bisa bilang "sudah selesai" kalau penggantian ini menutup kekurangan.
      fetch(`/api/cash-advances/${cashAdvanceId}/notify-reimbursed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reimbursementId: inserted.id }),
      }).catch(() => {});

      if (updatedCa?.status === "closed") {
        await handleClosed();
      }

      setReimburseFile(null);
      setReimburseNote("");
      router.refresh();
    } catch (err) {
      timer.clear();
      setError(toTimeoutError(err, timer).message || "Gagal menyimpan penggantian. Coba lagi.");
      reimburseBusyRef.current = false;
    } finally {
      setReimbursing(false);
    }
  }

  // Batalkan pengembalian yang belum dikonfirmasi (mis. supaya kwitansi
  // bisa dikoreksi dulu). Policy returns_delete_unconfirmed di DB yang
  // menjaga hanya yang belum dikonfirmasi yang bisa dihapus.
  async function handleCancelReturn(returnId) {
    setError("");
    setConfirmingId(returnId);
    const supabase = createClient();
    const { data, error: deleteError } = await supabase
      .from("cash_advance_returns")
      .delete()
      .eq("id", returnId)
      .is("confirmed_at", null)
      .select("id");
    setConfirmingId(null);
    setRowAction(null);
    if (deleteError || !data?.length) {
      setError("Gagal membatalkan pengembalian.");
      return;
    }
    setSuccess("Pengembalian dibatalkan.");
    router.refresh();
  }

  async function handleConfirm(returnId) {
    if (confirmBusyRef.current) return;
    // Jaga-jaga di frontend selain tombol disembunyikan: Ops tidak boleh
    // mengonfirmasi pengembalian atas pengajuannya sendiri. Dicegah juga di
    // RLS (returns_confirm, migrasi 0033) agar tidak bisa dilewati lewat API langsung.
    if (isOwner) {
      setError("Anda tidak bisa mengonfirmasi pengembalian atas pengajuan Anda sendiri.");
      return;
    }
    confirmBusyRef.current = true;
    setError("");
    setSuccess("");
    setConfirmingId(returnId);

    const supabase = createClient();
    // Lebih dari 15 detik belum terkirim -> hentikan dan minta klik ulang
    // (mengonfirmasi dua kali aman: barisnya sama, hanya ditulis ulang).
    const timer = createRequestTimer();
    let updateError = null;
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      ({ error: updateError } = await supabase
        .from("cash_advance_returns")
        .update({ confirmed_by: user.id, confirmed_at: new Date().toISOString() })
        .eq("id", returnId)
        .abortSignal(timer.signal));
    } catch (err) {
      updateError = err;
    }
    timer.clear();

    if (updateError) {
      setError(
        timer.timedOut
          ? TIMEOUT_MESSAGE.replace("tombolnya", "Ya, dana sudah diterima")
          : "Gagal mengonfirmasi pengembalian."
      );
      if (timer.timedOut) router.refresh();
      setConfirmingId(null);
      confirmBusyRef.current = false;
      return;
    }

    const { data: updatedCa } = await supabase
      .from("cash_advances")
      .select("status")
      .eq("id", cashAdvanceId)
      .single();

    if (updatedCa?.status === "closed") {
      await handleClosed();
    }

    setConfirmingId(null);
    confirmBusyRef.current = false;
    setRowAction(null);
    const done = returns?.find((r) => r.id === returnId);
    setSuccess(
      done
        ? `Pengembalian ${formatCurrency(done.amount)} berhasil dikonfirmasi.`
        : "Pengembalian berhasil dikonfirmasi."
    );
    router.refresh();
  }

  async function handleCloseDirect() {
    if (closeBusyRef.current) return;
    closeBusyRef.current = true;
    setError("");
    setClosing(true);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("cash_advances")
      .update({ status: "closed" })
      .eq("id", cashAdvanceId);

    if (updateError) {
      setError("Gagal menutup pengajuan.");
      setClosing(false);
      closeBusyRef.current = false;
      return;
    }

    await handleClosed();
    setClosing(false);
    router.refresh();
  }

  // Simpan laporan PDF ke folder Drive pengajuan. Kalau gagal, tombol
  // "Simpan Laporan ke Drive" tetap muncul untuk dicoba ulang.
  // force = buat ulang & simpan file laporan baru (mis. setelah lampiran
  // yang dulu gagal dimuat sudah bisa dimuat).
  async function archiveReport({ force = false } = {}) {
    setArchiving(true);
    try {
      const res = await fetch(
        `/api/cash-advances/${cashAdvanceId}/report${force ? "?force=1" : ""}`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Gagal menyimpan laporan ke Drive.");
      }
    } catch {
      setError("Gagal menyimpan laporan ke Drive.");
    } finally {
      setArchiving(false);
    }
  }

  // Saat pengajuan selesai hanya laporan PDF yang disimpan ke Drive; CSV tidak
  // lagi diunduh otomatis (tetap bisa lewat tombol "Unduh data (CSV)").
  async function handleClosed() {
    await archiveReport();
  }

  function selectAccount(number) {
    setSelectedAcc(number);
    setAccError("");
  }

  async function copyAccount(number) {
    selectAccount(number); // menyalin = memilih rekening ini untuk transfer
    try {
      await navigator.clipboard.writeText(number);
      setCopiedAcc(number);
      setTimeout(() => setCopiedAcc((cur) => (cur === number ? null : cur)), 2000);
    } catch {
      /* clipboard tidak tersedia: nomor tetap bisa diblok manual (select-all) */
    }
  }

  async function handleDownload() {
    const supabase = createClient();
    await downloadClosureReport(supabase, cashAdvanceId);
  }

  const hasReturns = returns && returns.length > 0;
  const hasReimbursements = reimbursements && reimbursements.length > 0;

  if (
    !hasReturns &&
    !hasReimbursements &&
    !showReturnForm &&
    !showReimburseForm &&
    !showDirectClose &&
    status !== "closed"
  ) {
    return null;
  }

  return (
    <div className="space-y-3">
      {(hasReturns || remaining > 0) && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Pengembalian Sisa Saldo
          </h3>

          {remaining > 0 && !showReturnForm && (
            <div className="mb-2 text-sm text-amber-800">
              Sisa saldo yang perlu dikembalikan:{" "}
              <span className="font-semibold">
                {formatCurrency(Math.max(remaining, 0))}
              </span>
              {remaining > 0 && (
                <div className="mt-2 border-t border-slate-200 pt-2">
                  <p className="text-xs">
                    Transfer sisa dana ke salah satu rekening berikut, lalu
                    unggah bukti transfernya:
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    {COMPANY_RETURN_ACCOUNTS.map((acc) => (
                      <li key={acc.number} className="text-xs">
                        {acc.bank} ·{" "}
                        <span className="font-semibold tracking-wide select-all">
                          {acc.number}
                        </span>{" "}
                        a.n. {acc.holder}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="mb-3 flex items-start gap-2 rounded-xl bg-emerald-50 px-3.5 py-3 text-sm font-semibold text-emerald-800"
            >
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              {success}
            </div>
          )}

          {hasReturns && (
            <div className="mb-2 space-y-3">
              {returns.map((r) => {
                const canAct = !r.confirmed_at && isOperational && !isOwner;
                const canCancel = !r.confirmed_at && (isOwner || isOperational);
                const acting = rowAction?.id === r.id ? rowAction.type : null;
                const busy = confirmingId === r.id;
                const proofTitle = `Bukti transfer ${formatCurrency(r.amount)}`;
                const returnDest = (r) => {
                  const number = r.dest_account_number;
                  if (!number) return null;
                  const acc = findCompanyAccount(number);
                  return {
                    bank: r.dest_bank || acc?.bank || "",
                    number,
                    holder: acc?.holder || "",
                  };
                };
                const dest = returnDest(r);
                return (
                  <div
                    key={r.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                  >
                    <div className="flex items-start gap-3 p-3.5">
                      {r.proof_drive_view_url && (
                        <DriveInlinePreview
                          url={r.proof_drive_view_url}
                          title={proofTitle}
                          variant="thumb"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
                          <p className="text-lg font-extrabold tabular-nums leading-tight tracking-tight text-slate-900">
                            {formatCurrency(r.amount)}
                          </p>
                          {r.confirmed_at ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                              <CheckCircle2 size={12} /> Terkonfirmasi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                              <Hourglass size={12} /> Menunggu konfirmasi
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          Dikembalikan {formatDate(r.return_date ?? r.created_at)}
                        </p>
                        {r.note && (
                          <p className="mt-1 break-words rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs leading-relaxed text-slate-700">
                            {r.note}
                          </p>
                        )}
                        {r.proof_drive_view_url && (
                          <FilePreviewLink
                            url={r.proof_drive_view_url}
                            title={proofTitle}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                          >
                            Lihat bukti <Eye size={12} />
                          </FilePreviewLink>
                        )}
                      </div>
                    </div>

                    {dest && (
                      <div
                        className={`flex items-start gap-2.5 border-t px-3.5 py-3 text-xs leading-relaxed ${
                          !r.confirmed_at && isOperational && !isOwner
                            ? "border-blue-100 bg-blue-50 text-blue-950"
                            : "border-slate-100 bg-slate-50 text-slate-700"
                        }`}
                      >
                        <Landmark size={15} className="mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-bold">
                            {isOwner
                              ? "Anda mentransfer ke rekening ini"
                              : "Requester mentransfer ke rekening ini"}
                          </p>
                          <p className="mt-0.5">
                            {dest.bank} ·{" "}
                            <span className="select-all font-bold tracking-wide">{dest.number}</span>
                            {dest.holder ? ` a.n. ${dest.holder}` : ""}
                          </p>
                          {!r.confirmed_at && isOperational && !isOwner && (
                            <p className="mt-1 font-semibold">
                              Cek mutasi rekening ini, lalu konfirmasi bila dana sudah masuk.
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {!r.confirmed_at && isOperational && isOwner && (
                      <p className="border-t border-slate-100 bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-600">
                        Anda tidak bisa mengonfirmasi pengembalian atas pengajuan Anda sendiri.
                        Minta Tim Operasional lain.
                      </p>
                    )}

                    {acting === "confirm" && (
                      <div className="space-y-3 border-t border-emerald-100 bg-emerald-50/70 px-3.5 py-3">
                        <p className="text-xs leading-relaxed text-emerald-900">
                          Pastikan dana{" "}
                          <span className="font-bold">{formatCurrency(r.amount)}</span> sudah masuk
                          ke{" "}
                          {dest ? (
                            <span className="font-bold">
                              {dest.bank} {dest.number}
                            </span>
                          ) : (
                            "rekening perusahaan"
                          )}{" "}
                          dan sesuai bukti transfer. Konfirmasi tidak bisa dibatalkan.
                        </p>
                        {error && (
                          <p role="alert" className="flex items-start gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
                            <AlertCircle size={14} className="mt-px shrink-0" />
                            {error}
                          </p>
                        )}
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setRowAction(null)}
                            disabled={busy}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            Periksa lagi
                          </button>
                          <button
                            type="button"
                            onClick={() => handleConfirm(r.id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <Check size={13} strokeWidth={3} />
                            {busy ? "Mengonfirmasi..." : "Ya, dana sudah diterima"}
                          </button>
                        </div>
                      </div>
                    )}

                    {acting === "cancel" && (
                      <div className="space-y-3 border-t border-rose-100 bg-rose-50/70 px-3.5 py-3">
                        <p className="text-xs leading-relaxed text-rose-900">
                          Batalkan pengembalian {formatCurrency(r.amount)}? Catatan ini akan
                          dihapus dan bisa dicatat ulang.
                        </p>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setRowAction(null)}
                            disabled={busy}
                            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            Tidak
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancelReturn(r.id)}
                            disabled={busy}
                            className="rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-60"
                          >
                            {busy ? "Membatalkan..." : "Ya, batalkan"}
                          </button>
                        </div>
                      </div>
                    )}

                    {!acting && (canAct || canCancel) && (
                      <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3.5 py-2.5">
                        {canCancel ? (
                          <button
                            type="button"
                            onClick={() => {
                              setError("");
                              setSuccess("");
                              setRowAction({ id: r.id, type: "cancel" });
                            }}
                            className="text-xs font-bold text-rose-600 hover:underline"
                          >
                            Batalkan
                          </button>
                        ) : (
                          <span />
                        )}
                        {canAct && (
                          <button
                            type="button"
                            onClick={() => {
                              setError("");
                              setSuccess("");
                              setRowAction({ id: r.id, type: "confirm" });
                            }}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#0f172a] px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                          >
                            <Check size={13} strokeWidth={3} />
                            Konfirmasi Pengembalian
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {(hasReimbursements || deficit > 0) && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Penggantian Kelebihan Belanja
          </h3>

          {balance < 0 && (
            <div className="mb-2 text-sm text-rose-800">
              Kekurangan yang perlu diganti ke requester:{" "}
              <span className="font-semibold">
                {formatCurrency(Math.max(deficit, 0))}
              </span>
              {deficit > 0 && (bankName || bankAccountNumber) && (
                <div className="mt-2 border-t border-rose-200 pt-2 text-xs">
                  Transfer ke rekening requester (sesuai pengajuan):
                  <p className="mt-1">
                    {bankName} ·{" "}
                    <span className="font-semibold tracking-wide select-all">
                      {bankAccountNumber}
                    </span>
                    {bankAccountHolder ? ` a.n. ${bankAccountHolder}` : ""}
                  </p>
                </div>
              )}
            </div>
          )}

          {hasReimbursements && (
            <div className="mb-2">
              {reimbursements.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 border-t border-slate-200 py-3 first:border-t-0"
                >
                  {r.proof_drive_view_url && (
                    <DriveInlinePreview
                      url={r.proof_drive_view_url}
                      title={`Bukti transfer ${formatCurrency(r.amount)}`}
                      variant="thumb"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">
                      {formatCurrency(r.amount)}
                    </p>
                    <p className="text-xs text-slate-600">
                      {formatDate(r.created_at)}
                      {r.note ? ` · ${r.note}` : ""}
                    </p>
                    {r.proof_drive_view_url && (
                      <FilePreviewLink
                        url={r.proof_drive_view_url}
                        title={`Bukti transfer ${formatCurrency(r.amount)}`}
                        className="text-xs text-brand inline-flex items-center gap-1 mt-1"
                      >
                        Lihat bukti <Eye size={12} />
                      </FilePreviewLink>
                    )}
                  </div>
                  <div className="shrink-0">
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                      Sudah diganti
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && !showReturnForm && (
        <div role="alert" className="font-medium text-sm text-rose-800 bg-rose-50 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      {showReturnForm && (
        <form id="return-form" onSubmit={handleSubmitReturn} className="space-y-7">
          {/* Sisa dana */}
          <div className="border-b border-slate-200 pb-5">
            <p className="text-sm text-slate-600">Sisa dana yang perlu dikembalikan</p>
            <p className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
              {formatCurrency(Math.max(remaining, 0))}
            </p>
            <dl className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-600">Total Plafon Diajukan</dt>
                <dd className="font-bold text-slate-900">{formatCurrency(amountRequested)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-slate-600">Total Realisasi Terpakai</dt>
                <dd className="font-bold text-slate-900">{formatCurrency(totalSpent)}</dd>
              </div>
            </dl>
          </div>

          {/* Jumlah */}
          <div className="space-y-2.5">
            <StepLabel n={1}>Jumlah yang Dikembalikan</StepLabel>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white py-2 pl-4 pr-2 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
              <span className="font-semibold text-slate-600">Rp</span>
              <CurrencyInput
                required
                value={amount}
                onValueChange={setAmount}
                className="min-w-0 flex-1 border-0 bg-transparent py-2 font-bold text-slate-900 outline-none focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setAmount(String(Math.max(remaining, 0)))}
                className="shrink-0 rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
              >
                Semua
              </button>
            </div>
            <p className="text-xs text-slate-600">Maksimal pengembalian sebesar sisa saldo.</p>
          </div>

          {/* Rekening tujuan */}
          <div ref={accBoxRef} className="space-y-2.5">
            <StepLabel n={2}>Transfer ke Rekening Perusahaan</StepLabel>
            <p className="text-xs leading-relaxed text-slate-600">
              Pilih satu rekening dengan menekan <span className="font-bold">Salin</span>. Rekening
              yang Anda pilih ikut dikirim ke Tim Operasional supaya mereka tahu mutasi mana yang
              dicek.
            </p>
            <div role="radiogroup" aria-label="Rekening tujuan pengembalian" className="space-y-2.5">
              {COMPANY_RETURN_ACCOUNTS.map((acc) => {
                const picked = selectedAcc === acc.number;
                return (
                  <div
                    key={acc.number}
                    role="radio"
                    aria-checked={picked}
                    tabIndex={0}
                    onClick={() => selectAccount(acc.number)}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        selectAccount(acc.number);
                      }
                    }}
                    className={`cursor-pointer rounded-2xl border p-4 transition-colors ${
                      picked
                        ? "border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-200"
                        : accError
                          ? "border-rose-300 bg-white hover:bg-slate-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900">{acc.bank}</p>
                      {picked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
                          <Check size={11} strokeWidth={3} /> Dipilih
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-600">Ketuk untuk memilih</span>
                      )}
                    </div>
                    <p className="mt-2 select-all text-xl font-extrabold tabular-nums tracking-wide text-slate-900">
                      {acc.number}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">a.n. {acc.holder}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyAccount(acc.number);
                      }}
                      className={`mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold ${
                        picked
                          ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                          : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      {copiedAcc === acc.number ? (
                        <>
                          <Check size={14} /> Nomor tersalin
                        </>
                      ) : (
                        <>
                          <Copy size={14} /> Salin nomor rekening
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            {selectedAcc && findCompanyAccount(selectedAcc) && (
              <p className="flex items-start gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold leading-relaxed text-emerald-900">
                <ArrowDownToLine size={14} className="mt-px shrink-0" />
                Transfer sisa dana ke {findCompanyAccount(selectedAcc).bank}, lalu unggah bukti
                transfernya di langkah 4.
              </p>
            )}
            {accError && (
              <p role="alert" className="flex items-start gap-1.5 text-xs font-semibold text-rose-700">
                <AlertCircle size={14} className="mt-px shrink-0" />
                {accError}
              </p>
            )}
          </div>

          {/* Tanggal */}
          <div className="space-y-2.5">
            <StepLabel n={3} htmlFor="return-date">
              Tanggal Pengembalian
            </StepLabel>
            <DateInput
              id="return-date"
              required
              value={returnDate}
              max={new Date().toLocaleDateString("en-CA")}
              onChange={setReturnDate}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 font-semibold text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          {/* Bukti */}
          <div className="space-y-2.5">
            <StepLabel n={4}>Bukti Transfer Bank</StepLabel>
            <button
              ref={proofBoxRef}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-invalid={proofError ? "true" : undefined}
              className={`flex w-full items-center gap-4 rounded-2xl border border-dashed bg-white px-4 py-4 text-left hover:bg-slate-50 ${
                proofError ? "border-rose-400 bg-rose-50/40 ring-2 ring-rose-200" : "border-slate-300 hover:border-slate-400"
              }`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                {file ? <FileText size={20} /> : <Upload size={20} />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-slate-900">
                  {file ? file.name : "Pilih atau Unggah Dokumen"}
                </span>
                <span className="mt-0.5 block text-xs text-slate-600">
                  {file
                    ? `${(file.size / (1024 * 1024)).toFixed(1)} MB · ketuk untuk mengganti`
                    : "JPG, PNG, atau PDF · Maks 5 MB"}
                </span>
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif,application/pdf"
              onChange={async (e) => {
                const raw = e.target.files?.[0];
                e.target.value = "";
                if (!raw) return setFile(null);
                const converted = await toJpegFile(raw);
                if (converted.size > 5 * 1024 * 1024) {
                  setFile(null);
                  setError("Ukuran file maksimal 5 MB.");
                  return;
                }
                setError("");
                setProofError("");
                setFile(converted);
              }}
              className="hidden"
            />
            {proofError && (
              <p role="alert" className="flex items-start gap-1.5 text-xs font-semibold text-rose-700">
                <AlertCircle size={14} className="mt-px shrink-0" />
                {proofError}
              </p>
            )}
            <LocalFilePreview file={file} className="mt-1" />
          </div>

          {/* Catatan */}
          <div className="space-y-2.5">
            <StepLabel n={5} htmlFor="return-note" optional>
              Catatan Tambahan
            </StepLabel>
            <textarea
              id="return-note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: Sisa dana kegiatan telah ditransfer dari rekening orang"
              className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-slate-900 placeholder:text-slate-600 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>

          {/* Tombol kirim menempel di bawah area gulir */}
          <div className="sticky bottom-0 z-10 -mx-6 -mb-5 space-y-2 border-t border-slate-100 bg-white px-6 py-4">
            {(error || proofError || accError) && (
              <p role="alert" className="flex items-start gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
                <AlertCircle size={14} className="mt-px shrink-0" />
                {error || accError || "Bukti transfer belum dilampirkan."}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-[#0f172a] py-3.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {submitting ? "Mengirim..." : "Kirim Pengembalian"}
            </button>
          </div>
        </form>
      )}

      {showReimburseForm && (
        <form
          onSubmit={handleSubmitReimbursement}
          className="space-y-3 border-t border-slate-200 pt-4"
        >
          <p className="text-sm font-semibold text-slate-700">
            Catat Penggantian ke Requester
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nominal Diganti (Rp)
            </label>
            <CurrencyInput
              required
              value={reimburseAmount}
              onValueChange={setReimburseAmount}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Catatan (opsional)
            </label>
            <input
              type="text"
              value={reimburseNote}
              onChange={(e) => setReimburseNote(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Bukti Transfer
            </label>
            <button
              ref={reimburseBoxRef}
              type="button"
              onClick={() => reimburseFileInputRef.current?.click()}
              className={`w-full flex items-center justify-center gap-2 border-2 border-dashed rounded-xl py-4 text-sm ${
                reimburseProofError ? "border-rose-400 bg-rose-50/40 text-rose-700" : "border-slate-300 text-slate-600"
              }`}
            >
              <Upload size={16} />
              {reimburseFile ? reimburseFile.name : "Unggah foto bukti transfer"}
            </button>
            <input
              ref={reimburseFileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              onChange={async (e) => {
                const raw = e.target.files?.[0];
                e.target.value = "";
                setReimburseProofError("");
                setReimburseFile(raw ? await toJpegFile(raw) : null);
              }}
              className="hidden"
            />
            {reimburseProofError && (
              <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs font-semibold text-rose-700">
                <AlertCircle size={14} className="mt-px shrink-0" />
                {reimburseProofError}
              </p>
            )}
            <LocalFilePreview file={reimburseFile} className="mt-2" />
          </div>
          <button
            type="submit"
            disabled={reimbursing}
            className="w-full bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-medium rounded-lg py-2.5 transition-colors"
          >
            {reimbursing ? "Menyimpan..." : "Simpan Penggantian"}
          </button>
        </form>
      )}

      {showDirectClose && (
        <button
          onClick={handleCloseDirect}
          disabled={closing}
          className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-medium rounded-xl py-3"
        >
          {closing ? "Menutup..." : "Tutup Pengajuan (Tidak Ada Sisa Saldo)"}
        </button>
      )}

      {status === "closed" && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Laporan</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {reportUrl ? (
              <FilePreviewLink
                url={reportUrl}
                title="Laporan penutupan"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Eye size={15} />
                Lihat Laporan
              </FilePreviewLink>
            ) : (
              <button
                onClick={async () => {
                  setError("");
                  await archiveReport();
                  router.refresh();
                }}
                disabled={archiving}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <Upload size={15} />
                {archiving ? "Menyimpan..." : "Simpan ke Drive"}
              </button>
            )}
            <a
              href={`/api/cash-advances/${cashAdvanceId}/report`}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              <FileText size={15} />
              Unduh PDF
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 font-medium text-slate-600 hover:text-brand"
            >
              <Download size={13} />
              Unduh data (CSV)
            </button>
            {reportUrl && (
              <button
                onClick={async () => {
                  setError("");
                  await archiveReport({ force: true });
                  router.refresh();
                }}
                disabled={archiving}
                title="Buat ulang laporan di Drive dari data terbaru"
                className="font-medium text-slate-600 hover:text-brand disabled:opacity-60"
              >
                {archiving ? "Membuat ulang laporan..." : "Perbarui laporan di Drive"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
