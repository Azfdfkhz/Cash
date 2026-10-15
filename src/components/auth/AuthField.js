// Pill-shaped labelled input with a leading icon and optional trailing slot,
// matching the mobile auth design. Extra props are passed to <input>.
export const authInputClass =
  "w-full h-13 rounded-full border border-slate-300 bg-white pl-12 pr-5 text-base text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15";

export function AuthLabel({ children, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-semibold text-slate-900 mb-2"
    >
      {children}
    </label>
  );
}

export default function AuthField({
  label,
  id,
  icon: Icon,
  trailing,
  hint,
  className = "",
  ...inputProps
}) {
  return (
    <div>
      {label && <AuthLabel htmlFor={id}>{label}</AuthLabel>}
      <div className="relative">
        {Icon && (
          <Icon
            size={20}
            strokeWidth={1.75}
            className="pointer-events-none absolute left-4.5 top-1/2 -translate-y-1/2 text-slate-500"
          />
        )}
        <input
          id={id}
          {...inputProps}
          className={`${authInputClass} ${trailing ? "pr-12" : ""} ${className}`}
        />
        {trailing && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {trailing}
          </div>
        )}
      </div>
      {hint && <p className="text-xs text-slate-400 mt-2">{hint}</p>}
    </div>
  );
}
