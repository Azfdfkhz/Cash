export default function PrimaryButton({
  children,
  className = "",
  desktop = "form",
  ...props
}) {
  // Tinggi/teks desktop per Figma: form (Daftar) 48px/14px, login 52px/16px.
  const lg =
    desktop === "login"
      ? "lg:h-[52px] lg:text-base"
      : "lg:h-12 lg:text-sm lg:tracking-[0.025em]";
  return (
    <button
      {...props}
      className={`w-full h-14 ${lg} flex items-center justify-center gap-2 rounded-full bg-[#0f172a] lg:bg-[#0d1527] text-base font-semibold text-white shadow-[0_8px_20px_-6px_rgba(15,23,42,0.5)] lg:shadow-sm hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60 transition ${className}`}
    >
      {children}
    </button>
  );
}
