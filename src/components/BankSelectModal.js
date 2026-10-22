"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Check } from "lucide-react";

// Logo tiles: white badge + colored wordmark (text only, no remote assets).
const BANKS = [
  { id: "bca", name: "BCA", label: "BCA", color: "#0060af", style: "font-extrabold tracking-tight" },
  { id: "mandiri", name: "Mandiri", label: "mandiri", color: "#003d79", style: "font-bold tracking-tighter text-xs lg:text-xs" },
  { id: "bri", name: "BRI", label: "BRI", color: "#00529c", style: "font-extrabold" },
  { id: "bni", name: "BNI", label: "BNI", color: "#f15a22", style: "font-extrabold" },
  { id: "cimb", name: "CIMB Niaga", label: "CIMB", color: "#ec1c24", style: "font-extrabold text-xs lg:text-xs" },
  { id: "bsi", name: "BSI", label: "BSI", color: "#00a39d", style: "font-extrabold" },
  { id: "btn", name: "BTN", label: "BTN", color: "#f5a000", style: "font-extrabold" },
  { id: "danamon", name: "Danamon", label: "DNN", color: "#e8590c", style: "font-extrabold" },
  { id: "permata", name: "Permata Bank", label: "PMT", color: "#7c3aed", style: "font-extrabold" },
  { id: "ocbc", name: "OCBC NISP", label: "OCBC", color: "#d0021b", style: "font-extrabold text-xs" },
];

function BankLogo({ bank, large = false }) {
  return (
    <div
      style={{ "--c": bank.color }}
      className={`shrink-0 flex items-center justify-center border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
        large
          ? "h-[44px] w-[56px] rounded-2xl lg:rounded-xl lg:shadow-xs"
          : "h-10 w-12 rounded-xl lg:h-8 lg:w-14 lg:rounded-lg"
      } lg:border-[color-mix(in_srgb,var(--c)_25%,white)] lg:bg-[color-mix(in_srgb,var(--c)_6%,white)]`}
    >
      <span
        className={`leading-none ${bank.style} ${large ? "text-base lg:text-xs" : "text-[13px] lg:text-xs"}`}
        style={{ color: bank.color }}
      >
        {bank.label}
      </span>
    </div>
  );
}

// Outer wrapper only mounts the sheet while open, so the inner component's
// state (search, selected bank, holder name) resets on every open.
export default function BankSelectModal({ isOpen, ...props }) {
  if (!isOpen) return null;
  return <BankSheet {...props} />;
}

function BankSheet({
  onClose,
  onSave,
  initialBank = "",
  initialHolderName = "",
}) {
  const [search, setSearch] = useState("");
  const [selectedBank, setSelectedBank] = useState(initialBank);
  const [holderName, setHolderName] = useState(initialHolderName);
  const overlayRef = useRef(null);

  // Close on Escape + lock background scroll while open
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const selected = BANKS.find((b) => b.id === selectedBank);
  const filtered = BANKS.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  function handleSave() {
    if (!selectedBank) return;
    const bank = BANKS.find((b) => b.id === selectedBank);
    onSave(bank?.name || selectedBank, holderName.trim());
    onClose();
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="animate-fade-in fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 lg:items-center lg:p-6"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pilih bank"
        className="animate-sheet-up flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-[40px] bg-white px-5 pt-3 shadow-2xl lg:h-[497px] lg:max-w-[740px] lg:rounded-3xl lg:px-0 lg:pt-0 lg:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]"
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pb-4 lg:hidden">
          <div className="h-1.5 w-10 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-5 lg:px-7 lg:pt-6 lg:pb-[17px] lg:border-b lg:border-slate-100">
          <h2 className="text-[22px] lg:text-xl lg:leading-[30px] lg:tracking-[-0.5px] font-bold tracking-tight text-slate-900 lg:text-[#0f172a]">
            Pilih bank
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <X size={18} className="text-slate-700" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* ── Left: search + list ── */}
          <div className="flex min-h-0 flex-1 flex-col lg:flex-none lg:w-[41.667%] lg:border-r lg:border-slate-100 lg:px-6 lg:pt-6">
            <div className="relative mb-4 lg:mb-4">
              <Search
                size={20}
                strokeWidth={1.75}
                className="pointer-events-none absolute left-4 lg:left-3.5 lg:size-4 top-1/2 -translate-y-1/2 text-slate-600"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari bank"
                className="w-full h-12 rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-base placeholder:text-slate-600 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15 lg:h-[37px] lg:rounded-xl lg:border-[#e2e8f0] lg:pl-[41px] lg:pr-3 lg:text-xs"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto -mx-1 px-1 pb-2">
              {filtered.map((bank) => {
                const isSelected = selectedBank === bank.id;
                return (
                  <div
                    key={bank.id}
                    className={`mb-1 rounded-3xl border-[1.5px] transition-colors lg:mb-1 lg:rounded-xl lg:border-transparent lg:bg-transparent ${
                      isSelected
                        ? "border-brand bg-[#f0f7ff]"
                        : "border-transparent"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedBank(bank.id)}
                      aria-pressed={isSelected}
                      className="flex w-full items-center gap-4 lg:gap-3 px-4 py-4 text-left lg:p-2 lg:rounded-xl lg:hover:bg-slate-50"
                    >
                      <BankLogo bank={bank} />
                      <span
                        className={`flex-1 text-base lg:text-xs text-slate-900 ${
                          isSelected ? "font-semibold lg:text-[#1e293b]" : "font-semibold lg:font-medium lg:text-slate-700"
                        }`}
                      >
                        {bank.name}
                      </span>
                      {isSelected ? (
                        <span className="h-6 w-6 lg:h-4 lg:w-4 rounded-full bg-brand lg:bg-[#2563eb] flex items-center justify-center">
                          <Check size={14} className="text-white lg:size-2.5" strokeWidth={3} />
                        </span>
                      ) : (
                        <span className="h-6 w-6 lg:h-4 lg:w-4 rounded-full border-2 lg:border border-slate-300" />
                      )}
                    </button>

                    {/* Mobile: inline "Atas nama" */}
                    {isSelected && (
                      <div className="px-4 pb-4 lg:hidden">
                        <label
                          htmlFor="holder-name"
                          className="block text-sm font-medium text-slate-800 mb-2"
                        >
                          Atas nama
                        </label>
                        <input
                          id="holder-name"
                          type="text"
                          value={holderName}
                          onChange={(e) => setHolderName(e.target.value)}
                          placeholder="Nama pemilik rekening"
                          className="w-full h-12 rounded-2xl border border-brand bg-white px-4 text-base text-slate-900 placeholder:text-slate-600 focus:outline-none focus:ring-4 focus:ring-brand/15"
                        />
                        <p className="text-[13px] text-slate-600 mt-2">
                          Harus sama dengan nama pemilik rekening.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <p className="text-center text-sm text-slate-600 py-8">
                  Bank tidak ditemukan
                </p>
              )}
            </div>
          </div>

          {/* ── Right (desktop): selected bank detail ── */}
          <div className="hidden lg:flex flex-1 flex-col p-6">
            <p className="text-xs leading-[16.5px] font-bold uppercase tracking-[0.55px] text-[#2563eb]">
              Bank dipilih
            </p>

            {selected ? (
              <>
                <div className="mt-3 flex items-center gap-4">
                  <BankLogo bank={selected} large />
                  <span className="text-lg leading-7 font-bold tracking-[-0.45px] text-[#0f172a]">
                    {selected.name}
                  </span>
                </div>
                <label
                  htmlFor="holder-name-desktop"
                  className="mt-6 block text-xs leading-4 font-semibold text-[#0f172a] mb-2"
                >
                  Atas nama
                </label>
                <input
                  id="holder-name-desktop"
                  type="text"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder="Nama pemilik rekening"
                  className="w-full h-12 rounded-xl border border-[#3b82f6] bg-white px-[17px] text-sm text-[#0f172a] placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#3b82f6]/10"
                />
                <p className="text-xs leading-[16.5px] text-[#64748b] mt-2">
                  Harus sama dengan nama pemilik rekening.
                </p>
              </>
            ) : (
              <p className="mt-4 text-slate-600">
                Pilih bank di daftar sebelah kiri.
              </p>
            )}

            <div className="mt-auto flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-full border border-[#e2e8f0] bg-white px-[29px] text-xs font-semibold text-[#334155] hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!selectedBank}
                className="h-10 rounded-full bg-[#111827] px-8 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40 transition"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>

        {/* Save button (mobile) */}
        <div className="pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:hidden">
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedBank}
            className="w-full h-14 rounded-full bg-[#0f172a] text-base font-semibold text-white shadow-[0_8px_20px_-6px_rgba(15,23,42,0.5)] hover:bg-slate-800 disabled:opacity-40 transition"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
