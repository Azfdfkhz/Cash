"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CurrencyInput from "@/components/CurrencyInput";

export default function NewCashAdvancePage() {
  const router = useRouter();
  const [purpose, setPurpose] = useState("");
  const [fundUsageDate, setFundUsageDate] = useState("");
  const [fundingSource, setFundingSource] = useState("");
  const [programRef, setProgramRef] = useState("");
  const [objective, setObjective] = useState("");
  const [rabUrl, setRabUrl] = useState("");
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
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
        .select("bank_name, bank_account_number")
        .eq("id", user.id)
        .single();
      if (!active || !profile) return;
      setBankName((prev) => prev || profile.bank_name || "");
      setBankAccountNumber((prev) => prev || profile.bank_account_number || "");
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError("Nominal harus lebih dari 0.");
      return;
    }

    if (fundingSource === "program" && !programRef.trim()) {
      setError("Masukkan ID campaign atau nama dana program.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setError("Sesi Anda sudah berakhir. Silakan masuk ulang.");
      return;
    }

    const { error } = await supabase.from("cash_advances").insert({
      requester_id: user.id,
      purpose,
      fund_usage_date: fundUsageDate,
      funding_source: fundingSource,
      program_ref: fundingSource === "program" ? programRef.trim() : null,
      objective,
      rab_url: rabUrl.trim() || null,
      amount_requested: numericAmount,
      bank_name: bankName,
      bank_account_number: bankAccountNumber,
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

    router.back();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Ajukan Cash Advance
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Pengajuan akan dikirim ke Tim Operasional untuk disetujui.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"
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
            Link RAB (Spreadsheet){" "}
            <span className="text-slate-400 font-normal">(opsional)</span>
          </label>
          <input
            type="url"
            value={rabUrl}
            onChange={(e) => setRabUrl(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            placeholder="https://docs.google.com/spreadsheets/..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nominal Diajukan (Rp)
          </label>
          <CurrencyInput
            required
            value={amount}
            onValueChange={setAmount}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Bank Tujuan Transfer (dengan atas nama)
          </label>
          <input
            type="text"
            required
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            placeholder="Contoh: BCA, Mandiri, BRI"
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
          <p className="text-xs text-slate-500 mt-2">
            Terisi otomatis dari profil. Ubah di sini kalau pengajuan ini pakai
            rekening lain, atau set default di halaman Profil.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brand hover:bg-brand-dark disabled:opacity-60 text-white font-medium rounded-lg py-2.5 transition-colors"
        >
          {loading ? "Mengirim..." : "Kirim Pengajuan"}
        </button>
      </form>
    </div>
  );
}
