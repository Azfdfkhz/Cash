export function GoogleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58Z" />
    </svg>
  );
}

export default function GoogleButton({ loading, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full h-13 lg:h-12 lg:border-[#cbd5e1] lg:text-[#1e293b] flex items-center justify-center gap-3 rounded-full border border-slate-300 bg-white text-[15px] font-semibold text-slate-900 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-60 transition-colors"
    >
      <GoogleIcon />
      {loading ? "Memproses..." : children}
    </button>
  );
}

export function OrDivider({ children }) {
  return (
    <div className="flex items-center gap-4 my-7 lg:my-5">
      <div className="h-px flex-1 bg-slate-200" />
      <span className="text-[13px] lg:text-xs text-slate-500 lg:text-[#64748b]">{children}</span>
      <div className="h-px flex-1 bg-slate-200" />
    </div>
  );
}
