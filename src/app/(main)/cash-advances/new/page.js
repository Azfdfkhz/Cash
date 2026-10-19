"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notifyOps } from "@/lib/receiptScan";
import BankInput from "@/components/BankInput";
import KindSwitch from "@/components/KindSwitch";
import RabEditor, { newRabItem, toRabRows } from "@/components/RabEditor";
import { formatCurrency } from "@/lib/utils";
import { rabTotal } from "@/lib/rab";

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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // RAB wajib; nominal diajukan = total RAB (dijaga juga oleh trigger
    // sync_ca_amount_from_rab di DB).
    if (!rabItems.length) {
      setError("RAB wajib diisi minimal satu baris.");
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
      setError(err.message);
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      setError("Total RAB harus lebih dari 0.");
      return;
    }

    if (fundingSource === "program" && !programRef.trim()) {
      setError("Masukkan ID campaign atau nama dana program.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    // Pengajuan + RAB disimpan sekaligus (atomik) lewat RPC, karena RAB tidak
    // bisa ditulis requester lagi setelah pengajuan berstatus pending.
    const { data: newId, error } = await supabase.rpc("create_cash_advance", {
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

    setLoading(false);

    if (error) {
      console.error("Gagal mengajukan Cash Advance:", error);
      setError(
        `Gagal mengajukan Cash Advance: ${error.message}${
          error.code ? ` (${error.code})` : ""
        }`
      );
      return;
    }

    notifyOps(newId);
    router.back();
    router.refresh();
  }

  return (
    <div className="space-y-4 lg:max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 lg:text-2xl lg:font-bold">
          Ajukan Cash Advance
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Pengajuan akan dikirim ke Tim Operasional untuk disetujui.
        </p>
      </div>

      <KindSwitch active="cash_advance" />

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
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Keperluan
          </label>
          <textarea
            required
            rows={3}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            placeholder="Contoh: Operasional perjalanan dinas ke Surabaya"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Tanggal Dana Mulai Digunakan
          </label>
          <input
            type="date"
            required
            value={fundUsageDate}
            onChange={(e) => setFundUsageDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Tujuan
          </label>
          <select
            required
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
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
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Sumber Dana
          </label>
          <select
            required
            value={fundingSource}
            onChange={(e) => {
              setFundingSource(e.target.value);
              if (e.target.value !== "program") setProgramRef("");
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          >
            <option value="" disabled>
              Pilih sumber dana
            </option>
            <option value="program">Program</option>
            <option value="marketing_operasional">Marketing / Operasional</option>
            <option value="program_lainnya">Program Lainnya</option>
          </select>
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
              placeholder="Contoh: CMP-2026-014 atau nama dana program"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            RAB
          </label>
          <RabEditor
            items={rabItems}
            onItemsChange={setRabItems}
            sourceUrl={rabUrl}
            onSourceUrlChange={setRabUrl}
            onImported={({ title }) => setPurpose((prev) => prev || title)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nominal Diajukan (Rp)
          </label>
          <p className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold text-slate-900">
            {formatCurrency(rabTotal(rabItems))}
          </p>
          <p className="text-xs text-slate-500 mt-1">Mengikuti total RAB.</p>
        </div>

        {profileBankMissing && (
          <div className="flex gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-800">
            <Info size={16} className="shrink-0 mt-0.5" />
            <p>
              Rekening default Anda belum lengkap di{" "}
              <Link href="/profile" className="font-semibold underline">
                Pengaturan
              </Link>
              . Isi di sana supaya bank, nomor rekening, dan atas nama terisi
              otomatis setiap mengajukan. Untuk pengajuan ini, isi langsung di
              bawah.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Bank Tujuan Transfer
          </label>
          <BankInput
            required
            value={bankName}
            onChange={setBankName}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nomor Rekening
          </label>
          <input
            type="text"
            required
            inputMode="numeric"
            value={bankAccountNumber}
            onChange={(e) =>
              setBankAccountNumber(e.target.value.replace(/\D/g, ""))
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
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
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            placeholder="Nama pemilik rekening sesuai buku tabungan"
          />
          <p className="text-xs text-slate-500 mt-2">
            Terisi otomatis dari profil. Ubah di sini kalau pengajuan ini pakai
            rekening lain, atau set default di halaman Profil.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-medium rounded-lg py-2.5 transition-colors lg:rounded-full lg:bg-dark-navy lg:font-semibold lg:hover:bg-slate-800"
        >
          {loading ? "Mengirim..." : "Kirim Pengajuan"}
        </button>
      </form>
    </div>
  );
}
