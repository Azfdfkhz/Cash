import { Backdrop } from "@/components/auth/AuthShell";

// Jeda singkat supaya animasi sukses sempat terlihat sebelum pindah halaman.
// Pengguna dengan "kurangi gerakan" hanya menunggu sebentar.
export const AUTH_SUCCESS_MS = 1300;
export function waitForAuthAnimation(ms = AUTH_SUCCESS_MS) {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return new Promise((resolve) => setTimeout(resolve, reduce ? 150 : ms));
}

const CONFETTI_COLORS = ["#60a5fa", "#34d399", "#fbbf24", "#f472b6", "#a78bfa", "#ffffff"];
const CONFETTI = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2 + (i % 2 ? 0.2 : 0);
  const dist = i % 2 ? 92 : 128;
  return {
    tx: Math.round(Math.cos(angle) * dist),
    ty: Math.round(Math.sin(angle) * dist),
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  };
});

// Layar penuh "berhasil": lingkaran centang tergambar, cincin berdenyut,
// percikan warna, lalu bilah kemajuan sampai pindah halaman.
export default function AuthSuccess({ show, title, subtitle }) {
  if (!show) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="auth-success fixed inset-0 z-[100] isolate flex flex-col items-center justify-center overflow-hidden bg-[#0d1527] px-6 text-center text-white"
    >
      <Backdrop />

      <div className="relative h-28 w-28">
        <span className="auth-success-ring" />
        <span className="auth-success-ring" style={{ animationDelay: "0.55s" }} />
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            className="auth-confetti"
            style={{ "--tx": `${c.tx}px`, "--ty": `${c.ty}px`, background: c.color }}
          />
        ))}
        <div className="auth-success-badge relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_18px_50px_-10px_rgba(37,99,235,0.8)]">
          <svg
            viewBox="0 0 24 24"
            width="52"
            height="52"
            fill="none"
            stroke="white"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="auth-check"
            style={{ "--len": 24 }}
            aria-hidden="true"
          >
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        </div>
      </div>

      <h2 className="auth-success-text mt-8 text-2xl font-bold tracking-tight lg:text-3xl">
        {title}
      </h2>
      {subtitle && (
        <p className="auth-success-text mt-2 max-w-xs text-sm text-slate-300 lg:text-base">
          {subtitle}
        </p>
      )}

      <div className="mt-10 h-1 w-40 overflow-hidden rounded-full bg-white/10">
        <div
          className="auth-success-bar h-full w-full rounded-full bg-blue-400"
          style={{ "--dur": `${AUTH_SUCCESS_MS}ms`, animationDelay: "0.2s" }}
        />
      </div>
    </div>
  );
}
