export default function PrimaryButton({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`w-full h-14 flex items-center justify-center gap-2 rounded-full bg-[#0f172a] text-base lg:text-[15px] font-semibold text-white shadow-[0_8px_20px_-6px_rgba(15,23,42,0.5)] hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60 transition ${className}`}
    >
      {children}
    </button>
  );
}
