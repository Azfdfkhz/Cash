import Image from "next/image";
import { Check } from "lucide-react";

// Logo Sharing Happiness (wordmark biru, jadi ditaruh di kartu putih supaya
// terbaca di atas header navy) + nama aplikasi.
function Brand() {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_6px_24px_-2px_rgba(37,99,235,0.45)] lg:h-16 lg:w-16">
        <Image
          src="/brand/sharinghappiness.png"
          alt="Sharing Happiness"
          width={800}
          height={417}
          priority
          className="h-auto w-10 lg:w-12"
        />
      </div>
      <span className="text-base font-semibold leading-tight tracking-tight lg:text-xl">
        CashAdvance &amp; Reimbursement
      </span>
    </div>
  );
}

// ── Desktop left-panel building blocks ──────────────────────────────
export function SideHeadline({ children }) {
  return (
    <h2 className="text-[44px] xl:text-5xl font-bold tracking-tight leading-[1.1]">
      {children}
    </h2>
  );
}

export function SideChecklist({ items }) {
  return (
    <ul className="mt-10 space-y-5">
      {items.map((t) => (
        <li key={t} className="flex items-center gap-4 text-lg text-slate-200">
          <Check size={22} strokeWidth={2.5} className="text-blue-500 shrink-0" />
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
    <ol className="mt-12">
      {steps.map((s, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={n} className="relative flex gap-4 pb-8 last:pb-0">
            {i < steps.length - 1 && (
              <span
                className={`absolute left-[19px] top-11 h-[calc(100%-2.75rem)] w-0.5 ${
                  done ? "bg-brand" : "bg-slate-700"
                }`}
              />
            )}
            <span
              className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold ${
                done
                  ? "bg-brand text-white"
                  : active
                    ? "border-2 border-slate-300 text-white"
                    : "border-2 border-slate-600 text-slate-400"
              }`}
            >
              {done ? <Check size={20} strokeWidth={3} /> : n}
            </span>
            <div className="pt-0.5">
              <p
                className={`font-semibold ${
                  done || active ? "text-white" : "text-slate-300"
                }`}
              >
                {s.title}
              </p>
              <p className="text-sm text-slate-400">{s.desc}</p>
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
//   wide    → wider form column on desktop (profile page)
export default function AuthShell({
  compact = false,
  step,
  title,
  subtitle,
  side,
  wide = false,
  children,
}) {
  return (
    <main className="min-h-dvh flex flex-col bg-dark-navy lg:grid lg:grid-cols-[44fr_56fr] lg:bg-white">
      {/* ───── Mobile header ───── */}
      <header
        className={`px-6 pb-14 ${compact ? "pt-8" : "pt-12"} text-white lg:hidden`}
      >
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
                  className={`h-1 flex-1 rounded-full ${
                    i < step.current ? "bg-brand" : "bg-slate-700"
                  }`}
                />
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
      <aside className="hidden lg:flex flex-col bg-[#0d1525] px-14 xl:px-24 py-14 text-white">
        <Brand />
        <div className="flex-1 flex flex-col justify-center py-12">{side}</div>
        <p className="text-sm text-slate-400">
          © Yayasan Peduli Bersama · Cash Advance v1.0.0
        </p>
      </aside>

      {/* ───── Form (white sheet on mobile / right column on desktop) ───── */}
      <section className="relative flex-1 -mt-6 rounded-t-[40px] bg-white px-6 pt-8 pb-10 lg:mt-0 lg:rounded-none lg:flex lg:items-center lg:justify-center lg:px-12 xl:px-16 lg:py-14">
        <div
          className={`mx-auto w-full max-w-sm ${
            wide ? "lg:max-w-xl" : "lg:max-w-lg"
          }`}
        >
          {children}
        </div>
      </section>
    </main>
  );
}
