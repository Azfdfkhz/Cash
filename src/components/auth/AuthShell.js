import Image from "next/image";
import { Check, Receipt, ShieldCheck, TrendingUp, Wallet } from "lucide-react";

// Latar bergerak (bola cahaya + grid). Dipakai di panel desktop, header mobile,
// dan layar sukses. Dekoratif saja; diletakkan di belakang konten (-z-10) di
// dalam elemen berstacking context (isolate).
//
// Tanpa bola cahaya / gradient blur / grid (membuat pusing): latar polos.
// Hanya kartu kaca melayang (chips) yang tersisa, di panel desktop layar lebar.
// Prop `plain` dipertahankan agar pemanggil lama tetap valid.
export function Backdrop({ chips = false }) {
  if (!chips) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      {chips && (
        <div className="hidden 2xl:contents">
          <span
            className="auth-chip-wrap right-[9%] top-[9%]"
            style={{ "--d": "1100ms" }}
          >
            <span className="auth-chip" style={{ "--r": "3deg", "--dur": "8s" }}>
              <Wallet size={16} className="text-sky-300" /> Cash Advance
            </span>
          </span>
          <span
            className="auth-chip-wrap right-[4%] top-[30%]"
            style={{ "--d": "1300ms" }}
          >
            <span
              className="auth-chip"
              style={{ "--r": "-2deg", "--dur": "9.5s", "--fd": "-3s" }}
            >
              <Receipt size={16} className="text-indigo-300" /> Kwitansi &amp; SPJ
            </span>
          </span>
          <span
            className="auth-chip-wrap bottom-[30%] right-[5%]"
            style={{ "--d": "1500ms" }}
          >
            <span
              className="auth-chip"
              style={{ "--r": "2deg", "--dur": "7.5s", "--fd": "-5s" }}
            >
              <ShieldCheck size={16} className="text-emerald-300" /> Persetujuan berjenjang
            </span>
          </span>
          <span
            className="auth-chip-wrap bottom-[11%] right-[10%]"
            style={{ "--d": "1700ms" }}
          >
            <span
              className="auth-chip"
              style={{ "--r": "-3deg", "--dur": "10s", "--fd": "-1s" }}
            >
              <TrendingUp size={16} className="text-blue-300" /> Terlacak real-time
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

// Logo Sharing Happiness tanpa kotak/latar. Wordmark aslinya biru, jadi di atas
// panel navy dibuat putih lewat filter (brightness-0 + invert) supaya tetap
// terbaca tanpa perlu kartu putih di belakangnya.
function Logo({ className = "" }) {
  return (
    <Image
      src="/brand/sharinghappiness.png"
      alt="Sharing Happiness"
      width={800}
      height={417}
      priority
      className={`h-auto brightness-100 ${className}`}
    />
  );
}

// Header mobile: logo + nama aplikasi.
function Brand() {
  return (
    <div className="auth-drop flex flex-col items-center gap-2 text-center">
      <Logo className="w-36" />
      <span className="text-sm font-medium leading-tight tracking-tight text-slate-200">
        Cash Advance &amp; Reimbursement
      </span>
    </div>
  );
}

// Brand panel kiri desktop: logo + nama aplikasi, tanpa tile/latar.
function DesktopBrand() {
  return (
    <div className="auth-drop flex flex-col items-start gap-3">
      <Logo className="w-48" />
      <span className="text-lg font-semibold tracking-[-0.2px] text-slate-200">
        Cash Advance &amp; Reimbursement
      </span>
    </div>
  );
}

// ── Desktop left-panel building blocks ──────────────────────────────
export function SideHeadline({ children, heavy = false }) {
  return (
    <h2
      className={`max-w-96 text-[48px] leading-[48px] tracking-[-1.2px] ${
        heavy ? "font-extrabold" : "font-bold"
      }`}
    >
      {children}
    </h2>
  );
}

export function SideChecklist({ items }) {
  return (
    <ul className="mt-10 space-y-4">
      {items.map((t) => (
        <li key={t} className="flex items-center gap-3.5 text-lg leading-7 text-[#e2e8f0]">
          <Check size={20} strokeWidth={2.5} className="text-blue-500 shrink-0" />
          {t}
        </li>
      ))}
    </ul>
  );
}

// current: 1 | 2  — step 1 is "done" when current is 2
export function SideSteps({ current }) {
  const steps = [
    {
      title: current > 1 ? "Akun dibuat" : "Buat akun",
      desc: "Email dan kata sandi",
    },
    {
      title: "Data rekening dan notifikasi",
      desc: "Untuk pencairan dana dan notifikasi",
    },
  ];
  return (
    <ol className="mt-14">
      {steps.map((s, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={n} className="relative flex gap-4 pb-[38px] last:pb-0">
            {i < steps.length - 1 && (
              <span
                className={`auth-line absolute left-[17px] top-10 h-10 w-0.5 ${
                  done ? "bg-[rgba(37,99,235,0.7)]" : "bg-slate-700"
                }`}
              />
            )}
            <span
              className={`h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold ${
                done
                  ? "bg-[#1a68ff] text-white shadow-md"
                  : active
                    ? "auth-pulse border-2 border-white/60 bg-[#0d1527] text-white"
                    : "border-2 border-slate-600 text-slate-400"
              }`}
            >
              {done ? <Check size={20} strokeWidth={2.5} /> : n}
            </span>
            <div className="pt-0.5">
              <p
                className={`text-base font-semibold leading-6 tracking-[0.4px] ${
                  done || active ? "text-white" : "text-slate-300"
                }`}
              >
                {s.title}
              </p>
              <p className="text-sm leading-5 text-[#9ca3af]">{s.desc}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// Shared layout for login / register / complete-profile.
//  Mobile  (<lg): navy header (title/subtitle/step bar) + white rounded sheet.
//  Desktop (≥lg): split screen — navy brand panel (`side`) | centered form.
//   compact → step pages (smaller top padding on mobile)
//   step    → { current, total, label } mobile progress bar
//   side    → desktop left-panel content (headline, checklist/steps…)
//   plainBackdrop → latar polos tanpa gradient blur (halaman buat akun)
//   variant → "login" memakai proporsi frame Login Figma (panel 44%, form 440px);
//             default = frame Daftar/Lengkapi data (panel 43%, form 576px)
export default function AuthShell({
  compact = false,
  step,
  title,
  subtitle,
  side,
  variant,
  plainBackdrop = false,
  children,
}) {
  const login = variant === "login";
  return (
    <main
      className={`min-h-dvh flex flex-col bg-dark-navy lg:grid lg:bg-white ${
        login ? "lg:grid-cols-[44fr_56fr]" : "lg:grid-cols-[43fr_57fr]"
      }`}
    >
      {/* ───── Mobile header ───── */}
      <header
        className={`auth-stagger relative isolate overflow-hidden px-6 pb-14 [--base:60ms] ${
          compact ? "pt-8" : "pt-12"
        } text-white lg:hidden`}
      >
        <Backdrop plain={plainBackdrop} />
        <Brand />

        {step && (
          <div className="mt-5">
            <p className="text-[13px] text-slate-300 mb-3">
              Langkah {step.current} dari {step.total} · {step.label}
            </p>
            <div className="flex gap-2" aria-hidden="true">
              {Array.from({ length: step.total }).map((_, i) => (
                <div
                  key={i}
                  className="h-1 flex-1 overflow-hidden rounded-full bg-slate-700"
                >
                  {i < step.current && (
                    <div
                      className="auth-bar h-full w-full rounded-full bg-brand"
                      style={{ animationDelay: `${450 + i * 200}ms` }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {title && (
          <h1
            className={`font-bold tracking-tight leading-[1.2] mt-12 ${
              step ? "text-3xl" : "text-[32px]"
            }`}
          >
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="mt-3 text-base text-slate-300">{subtitle}</p>
        )}
      </header>

      {/* ───── Desktop brand panel ───── */}
      <aside
        className={`relative isolate hidden overflow-hidden lg:flex flex-col text-white ${
          login ? "bg-[#0c1322] p-20" : "bg-[#0d1527] p-24"
        }`}
      >
        <Backdrop chips plain={plainBackdrop} />
        <DesktopBrand />
        <div className="auth-side flex-1 flex flex-col justify-center py-12">{side}</div>
        <p
          className={
            login
              ? "text-sm leading-5 text-[#94a3b8]"
              : "text-xs leading-4 tracking-[0.3px] text-[#9ca3af]"
          }
        >
          © Yayasan Berbagi Bahagia
        </p>
      </aside>

      {/* ───── Form (white sheet on mobile / right column on desktop) ───── */}
      <section className={`auth-sheet relative flex-1 -mt-6 rounded-t-[40px] bg-white px-6 pt-8 pb-10 lg:mt-0 lg:rounded-none lg:flex lg:items-center lg:justify-center lg:py-16 ${
          login ? "lg:px-12" : "lg:px-28"
        }`}>
        <div
          className={`auth-stagger mx-auto w-full max-w-sm ${
            login ? "lg:max-w-[440px]" : "lg:max-w-[576px]"
          }`}
        >
          {children}
        </div>
      </section>
    </main>
  );
}
