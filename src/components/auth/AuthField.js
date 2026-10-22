// Pill-shaped labelled input with a leading icon and optional trailing slot,
// matching the mobile auth design. Extra props are passed to <input>.
export const authInputClass =
  "w-full h-13 rounded-full border border-slate-300 bg-white pl-12 pr-5 text-base text-slate-900 placeholder:text-slate-600 transition-colors focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/15 lg:pl-11 lg:text-sm";

// Bentuk input desktop per frame Figma:
//  "round" (default) = Daftar/Lengkapi data -> tinggi 51px, radius 16px
//  "soft"            = Login -> tinggi 48px, radius 12px
const lgShape = {
  round: "lg:h-[51px] lg:rounded-2xl lg:border-[#d1d5db] lg:shadow-xs",
  soft: "lg:h-12 lg:rounded-xl lg:border-slate-300",
};

export function AuthLabel({ children, htmlFor }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-semibold text-slate-900 lg:text-[#1f2937] mb-2"
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
  shape = "round",
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
            className="pointer-events-none absolute left-4.5 lg:left-4 top-1/2 -translate-y-1/2 text-slate-600"
          />
        )}
        <input
          id={id}
          {...inputProps}
          className={`${authInputClass} ${lgShape[shape]} ${trailing ? "pr-12" : ""} ${className}`}
        />
        {trailing && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {trailing}
          </div>
        )}
      </div>
      {hint && <p className="text-xs text-slate-600 mt-2">{hint}</p>}
    </div>
  );
}
