import { ChevronDown } from "lucide-react";

// Gaya isian untuk form pengajuan (sesuai Figma: radius besar, border tipis).
export const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";

export function Field({ label, required = false, hint, htmlFor, helper, children }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-900">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
        {hint && <span className="text-xs text-slate-500">{hint}</span>}
      </div>
      {children}
      {helper}
    </div>
  );
}

export function SelectField({ id, value, onChange, required, children }) {
  return (
    <div className="relative">
      <select
        id={id}
        required={required}
        value={value}
        onChange={onChange}
        className={`${inputCls} appearance-none pr-11`}
      >
        {children}
      </select>
      <ChevronDown
        size={18}
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
      />
    </div>
  );
}

// "2026-10-10" -> "Sabtu, 10 Okt 2026"
export function formatWeekdayDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

// "BCA", "1234568821" -> "BCA ••• 8821"
export function maskedAccount(bank, number) {
  const last4 = String(number ?? "").slice(-4);
  return [bank, last4 && `••• ${last4}`].filter(Boolean).join(" ");
}
