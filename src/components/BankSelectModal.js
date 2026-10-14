"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Check } from "lucide-react";

const BANKS = [
  { id: "bca", name: "BCA", label: "BCA", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  { id: "mandiri", name: "Mandiri", label: "mandiri", bg: "bg-blue-800", text: "text-white", border: "" },
  { id: "bri", name: "BRI", label: "BRI", bg: "bg-blue-600", text: "text-white", border: "" },
  { id: "bni", name: "BNI", label: "BNI", bg: "bg-orange-500", text: "text-white", border: "" },
  { id: "cimb", name: "CIMB Niaga", label: "CIMB", bg: "bg-red-600", text: "text-white", border: "" },
  { id: "bsi", name: "BSI", label: "BSI", bg: "bg-emerald-600", text: "text-white", border: "" },
  { id: "btn", name: "BTN", label: "BTN", bg: "bg-yellow-500", text: "text-white", border: "" },
  { id: "danamon", name: "Danamon", label: "DNN", bg: "bg-red-500", text: "text-white", border: "" },
  { id: "permata", name: "Permata Bank", label: "PMT", bg: "bg-purple-600", text: "text-white", border: "" },
  { id: "ocbc", name: "OCBC NISP", label: "OCBC", bg: "bg-red-700", text: "text-white", border: "" },
];

export default function BankSelectModal({
  isOpen,
  onClose,
  onSave,
  initialBank = "",
  initialHolderName = "",
}) {
  const [search, setSearch] = useState("");
  const [selectedBank, setSelectedBank] = useState(initialBank);
  const [holderName, setHolderName] = useState(initialHolderName);
  const overlayRef = useRef(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setSelectedBank(initialBank);
      setHolderName(initialHolderName);
    }
  }, [isOpen, initialBank, initialHolderName]);

  if (!isOpen) return null;

  const filtered = BANKS.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  function handleSave() {
    if (!selectedBank) return;
    const bank = BANKS.find((b) => b.id === selectedBank);
    onSave(bank?.name || selectedBank, holderName);
    onClose();
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
    >
      <div className="w-full max-w-lg bg-white rounded-t-3xl shadow-xl animate-in slide-in-from-bottom duration-300">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1.5 w-10 rounded-full bg-slate-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Pilih bank</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
          >
            <X size={16} className="text-slate-600" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-slate-100">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari bank"
              className="w-full rounded-xl border border-slate-200 pl-9 pr-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Bank list */}
        <div className="px-4 py-2 max-h-72 overflow-y-auto">
          {filtered.map((bank) => {
            const isSelected = selectedBank === bank.id;
            return (
              <div key={bank.id}>
                <button
                  type="button"
                  onClick={() => setSelectedBank(bank.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all mb-1 ${
                    isSelected
                      ? "bg-blue-50 border border-brand/30"
                      : "hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  {/* Bank badge */}
                  <div
                    className={`h-9 w-14 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${bank.bg} ${bank.text} ${bank.border ? `border ${bank.border}` : ""}`}
                  >
                    {bank.label}
                  </div>

                  {/* Bank name */}
                  <span className="flex-1 text-sm font-medium text-slate-800">
                    {bank.name}
                  </span>

                  {/* Radio / check */}
                  {isSelected ? (
                    <div className="h-5 w-5 rounded-full bg-brand flex items-center justify-center">
                      <Check size={12} className="text-white" strokeWidth={3} />
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-slate-300" />
                  )}
                </button>

                {/* Expanded: Atas nama field */}
                {isSelected && (
                  <div className="mx-3 mb-2 px-3 py-3 bg-white border border-brand/20 rounded-xl">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Atas nama
                    </label>
                    <input
                      type="text"
                      value={holderName}
                      onChange={(e) => setHolderName(e.target.value)}
                      placeholder="Nama pemilik rekening"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
                    />
                    <p className="text-xs text-slate-400 mt-1.5">
                      Harus sama dengan nama pemilik rekening.
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-6">
              Bank tidak ditemukan
            </p>
          )}
        </div>

        {/* Save button */}
        <div className="px-6 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={handleSave}
            disabled={!selectedBank}
            className="w-full bg-dark-navy hover:bg-slate-800 disabled:opacity-40 text-white font-semibold rounded-full py-3.5 transition-colors"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
