"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Check } from "lucide-react";

// Logo tiles: white badge + colored wordmark (text only, no remote assets).
const BANKS = [
  { id: "bca", name: "BCA", label: "BCA", color: "#0060af", style: "font-extrabold tracking-tight" },
  { id: "mandiri", name: "Mandiri", label: "mandiri", color: "#003d79", style: "font-bold tracking-tighter text-[10px]" },
  { id: "bri", name: "BRI", label: "BRI", color: "#00529c", style: "font-extrabold" },
  { id: "bni", name: "BNI", label: "BNI", color: "#f15a22", style: "font-extrabold" },
  { id: "cimb", name: "CIMB Niaga", label: "CIMB", color: "#ec1c24", style: "font-extrabold text-xs" },
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
          ? "h-[44px] w-[56px] rounded-2xl"
          : "h-10 w-12 rounded-xl lg:h-7 lg:w-10 lg:rounded-lg"
      } lg:border-[color-mix(in_srgb,var(--c)_25%,white)] lg:bg-[color-mix(in_srgb,var(--c)_6%,white)] lg:shadow-none`}
    >
      <span
        className={`leading-none ${bank.style} ${large ? "text-base" : "text-[13px] lg:text-[11px]"}`}
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
        className="animate-sheet-up flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-[40px] bg-white px-5 pt-3 shadow-2xl lg:h-[520px] lg:max-w-[780px] lg:rounded-[32px] lg:px-0 lg:pt-0"
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pb-4 lg:hidden">
          <div className="h-1.5 w-10 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between pb-5 lg:px-8 lg:py-5 lg:border-b lg:border-slate-100">
          <h2 className="text-[22px] font-bold tracking-tight text-slate-900">
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
          <div className="flex min-h-0 flex-1 flex-col lg:flex-none lg:w-[42%] lg:border-r lg:border-slate-100 lg:px-6 lg:pt-6">
            <div className="relative mb-4">
              <Search
                size={20}
                strokeWidth={1.75}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari bank"
                className="w-full h-12 rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-base placeholder:text-slate-400 focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15 lg:h-11 lg:rounded-full"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto -mx-1 px-1 pb-2">
              {filtered.map((bank) => {
                const isSelected = selectedBank === bank.id;
                return (
                  <div
                    key={bank.id}
                    className={`mb-1 rounded-3xl border-[1.5px] transition-colors lg:mb-0 lg:rounded-2xl lg:border-transparent lg:bg-transparent ${
                      isSelected
                        ? "border-brand bg-[#f0f7ff]"
                        : "border-transparent"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedBank(bank.id)}
                      aria-pressed={isSelected}
                      className="flex w-full items-center gap-4 px-4 py-4 text-left lg:px-2 lg:py-2.5 lg:rounded-2xl lg:hover:bg-slate-50"
                    >
                      <BankLogo bank={bank} />
                      <span
                        className={`flex-1 text-base text-slate-900 ${
                          isSelected ? "font-semibold" : "font-semibold lg:font-medium lg:text-slate-700"
                        }`}
                      >
                        {bank.name}
                      </span>
                      {isSelected ? (
                        <span className="h-6 w-6 rounded-full bg-brand flex items-center justify-center">
                          <Check size={14} className="text-white" strokeWidth={3} />
                        </span>
                      ) : (
                        <span className="h-6 w-6 rounded-full border-2 border-slate-300" />
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
                          className="w-full h-12 rounded-2xl border border-brand bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand/15"
                        />
                        <p className="text-[13px] text-slate-500 mt-2">
                          Harus sama dengan nama pemilik rekening.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <p className="text-center text-sm text-slate-400 py-8">
                  Bank tidak ditemukan
                </p>
              )}
            </div>
          </div>

          {/* ── Right (desktop): selected bank detail ── */}
          <div className="hidden lg:flex flex-1 flex-col p-8">
            <p className="text-[13px] font-semibold uppercase tracking-wider text-brand">
              Bank dipilih
            </p>

            {selected ? (
              <>
                <div className="mt-4 flex items-center gap-5">
                  <BankLogo bank={selected} large />
                  <span className="text-3xl font-bold tracking-tight text-slate-900">
                    {selected.name}
                  </span>
                </div>
                <label
                  htmlFor="holder-name-desktop"
                  className="mt-8 block text-base font-semibold text-slate-900 mb-2.5"
                >
                  Atas nama
                </label>
                <input
                  id="holder-name-desktop"
                  type="text"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder="Nama pemilik rekening"
                  className="w-full h-12 rounded-2xl border border-brand bg-white px-5 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-brand/15"
                />
                <p className="text-sm text-slate-500 mt-3">
                  Harus sama dengan nama pemilik rekening.
                </p>
              </>
            ) : (
              <p className="mt-4 text-slate-400">
                Pilih bank di daftar sebelah kiri.
              </p>
            )}

            <div className="mt-auto flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-12 rounded-full border border-slate-200 bg-white px-8 text-base font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!selectedBank}
                className="h-12 rounded-full bg-[#0f172a] px-8 text-base font-semibold text-white hover:bg-slate-800 disabled:opacity-40 transition"
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
