"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  START_TOUR_EVENT,
  TOUR_STATUS,
  resumeIndex,
  tourMetadata,
  tourStepsFor,
  welcomeCopy,
} from "@/lib/tour/tourConfig";
import {
  MOBILE_MAX,
  computeTooltipPosition,
  needsScroll,
  scrollDelta,
  spotlightRect,
} from "@/lib/tour/placement";

// Tur interaktif berbasis sorotan elemen UI nyata.
//
//  - Elemen target ditandai atribut data-tour="..." (stabil, bukan koordinat).
//  - Tur menunggu elemen selesai dirender, berpindah halaman bila perlu, dan
//    jatuh ke kartu penjelasan di tengah layar bila elemen tidak tampil.
//  - Tur TIDAK pernah mengklik apa pun atas nama pengguna. Di luar sorotan,
//    halaman diredupkan dan tidak bisa diklik; sorotan hanya bisa diklik pada
//    langkah `interactive` (mengisi formulir).
//  - Status tur (belum mulai / berlangsung / selesai / dilewati) disimpan di
//    user_metadata akun Supabase Auth, sama seperti penanda onboarding lama.
//    Tidak ada perubahan skema database dan tidak memakai localStorage.

const subscribeNoop = () => () => {};

function findTarget(name) {
  const nodes = document.querySelectorAll(`[data-tour="${name}"]`);
  for (const n of nodes) {
    if (n.closest("[data-tour-ui]")) continue;
    const r = n.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && getComputedStyle(n).visibility !== "hidden") return n;
  }
  return null;
}

function isFixedLike(el) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (getComputedStyle(n).position === "fixed") return true;
  }
  return false;
}

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function focusableIn(root) {
  return [
    ...root.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'),
  ];
}

const btnPrimary =
  "rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2";
const btnSecondary =
  "rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

// ───────── Dialog sambutan & lanjutkan ─────────

function IntroDialog({ id, eyebrow, title, body, children, onEscape }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onEscape();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEscape]);

  return (
    <div
      data-tour-ui
      className="animate-fade-in fixed inset-0 z-[90] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-body`}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 focus:outline-none"
      >
        <p className="text-xs font-bold uppercase tracking-[0.6px] text-brand">{eyebrow}</p>
        <h2 id={`${id}-title`} className="mt-2 text-xl font-bold text-slate-900">
          {title}
        </h2>
        <p id={`${id}-body`} className="mt-2 text-sm leading-relaxed text-slate-600">
          {body}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{children}</div>
      </div>
    </div>
  );
}

// ───────── Lapisan sorotan + tooltip ─────────

function TourLayer({ step, number, total, el, missing, onPrev, onNext, onSkip, onLost }) {
  const tipRef = useRef(null);
  const handlersRef = useRef({ onPrev, onNext, onSkip });
  const [geom, setGeom] = useState(null);

  useEffect(() => {
    handlersRef.current = { onPrev, onNext, onSkip };
  });

  // Gulir elemen ke posisi nyaman (kecuali elemen yang menempel di layar).
  useEffect(() => {
    if (!el || isFixedLike(el)) return;
    const viewport = { width: window.innerWidth, height: window.innerHeight };
    const mobile = viewport.width < MOBILE_MAX;
    const rect = el.getBoundingClientRect();
    const delta = scrollDelta(rect, viewport, mobile);
    // Ponsel: tooltip menempel di bawah layar, jadi elemen selalu dibawa ke dekat
    // bagian atas supaya ruang di bawahnya cukup. Desktop: gulir hanya bila perlu.
    const scroll = mobile ? Math.abs(delta) > 24 : needsScroll(rect, viewport);
    if (!scroll) return;
    window.scrollBy({ top: delta, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [el]);

  // Ukur terus-menerus (scroll, resize, perubahan tata letak, animasi) lewat rAF.
  useEffect(() => {
    let raf = 0;
    let last = "";
    const tick = () => {
      if (el && !el.isConnected) {
        onLost();
        return;
      }
      const tipEl = tipRef.current;
      const r = el ? el.getBoundingClientRect() : null;
      const tw = tipEl ? tipEl.offsetWidth : 0;
      const th = tipEl ? tipEl.offsetHeight : 0;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const key = `${r ? `${r.left | 0},${r.top | 0},${r.width | 0},${r.height | 0}` : "-"}|${tw}x${th}|${vw}x${vh}`;
      if (key !== last) {
        last = key;
        setGeom({
          rect: r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null,
          tw,
          th,
          vw,
          vh,
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [el, onLost]);

  // Keyboard: Esc = lewati, panah kiri/kanan = navigasi (saat fokus di tooltip).
  useEffect(() => {
    function onKey(e) {
      const tip = tipRef.current;
      const active = document.activeElement;
      const inTip = tip && active && tip.contains(active);
      if (e.key === "Escape") {
        const tag = active?.tagName;
        const typing = !inTip && (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT");
        if (!typing) handlersRef.current.onSkip();
      } else if (inTip && e.key === "ArrowRight") {
        handlersRef.current.onNext();
      } else if (inTip && e.key === "ArrowLeft") {
        handlersRef.current.onPrev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function trapTab(e) {
    if (e.key !== "Tab" || step.interactive || !el) return;
    const items = focusableIn(tipRef.current);
    if (items.length === 0) return;
    const first = items[0];
    const lastItem = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      lastItem.focus();
    } else if (!e.shiftKey && document.activeElement === lastItem) {
      e.preventDefault();
      first.focus();
    }
  }

  const viewport = geom ? { width: geom.vw, height: geom.vh } : null;
  const hole = geom && geom.rect ? spotlightRect(geom.rect, viewport) : null;
  const measured = Boolean(geom && geom.tw > 0);

  // Fokus ke tooltip begitu terlihat (elemen tersembunyi tidak bisa difokuskan).
  useEffect(() => {
    if (measured) tipRef.current?.focus({ preventScroll: true });
  }, [measured]);
  const pos = geom
    ? computeTooltipPosition({
        hole,
        tip: { width: geom.tw, height: geom.th },
        viewport,
        preferred: step.placement,
      })
    : { kind: "center" };

  let tipStyle;
  if (!measured) {
    tipStyle = { top: 0, left: 0, visibility: "hidden" };
  } else if (pos.kind === "float") {
    tipStyle = { top: pos.top, left: pos.left };
  } else if (pos.kind === "dock") {
    tipStyle = {
      left: 12,
      right: 12,
      ...(pos.edge === "bottom"
        ? { bottom: "max(12px, env(safe-area-inset-bottom))" }
        : { top: "max(12px, env(safe-area-inset-top))" }),
    };
  } else {
    tipStyle = { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
  }
  if (pos.kind !== "dock") tipStyle.width = "min(22rem, calc(100vw - 24px))";

  const dim = "fixed z-[80] bg-slate-900/55";
  const last = number === total;

  return (
    <div data-tour-ui>
      {hole ? (
        <>
          <div aria-hidden="true" className={dim} style={{ top: 0, left: 0, right: 0, height: hole.top }} />
          <div
            aria-hidden="true"
            className={dim}
            style={{ top: hole.top + hole.height, left: 0, right: 0, bottom: 0 }}
          />
          <div
            aria-hidden="true"
            className={dim}
            style={{ top: hole.top, left: 0, width: hole.left, height: hole.height }}
          />
          <div
            aria-hidden="true"
            className={dim}
            style={{ top: hole.top, left: hole.left + hole.width, right: 0, height: hole.height }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-[81] rounded-xl border-2 border-white shadow-[0_0_0_3px_rgba(37,99,235,0.9)] transition-[top,left,width,height] duration-150"
            style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
          />
          {!step.interactive && (
            // Pengaman: sorotan tidak bisa diklik, supaya tur tidak memicu aksi nyata.
            <div
              aria-hidden="true"
              className="fixed z-[81]"
              style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
            />
          )}
        </>
      ) : (
        <div aria-hidden="true" className={`${dim} inset-0`} />
      )}

      <div
        ref={tipRef}
        tabIndex={-1}
        role="dialog"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        onKeyDown={trapTab}
        style={tipStyle}
        className="animate-fade-in fixed z-[90] rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-200 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-[0.6px] text-brand" aria-live="polite">
            {step.chapter} · Langkah {number} dari {total}
          </p>
          <button
            type="button"
            onClick={onSkip}
            aria-label="Tutup tur"
            className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X size={16} />
          </button>
        </div>

        <h2 id="tour-title" className="mt-2 text-base font-bold text-slate-900">
          {step.title}
        </h2>
        <p id="tour-body" className="mt-1.5 text-sm leading-relaxed text-slate-600">
          {missing && step.fallback ? step.fallback : step.body}
        </p>
        {missing && (
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-500">
            Bagian ini sedang tidak tampil di layar, jadi tidak bisa disorot.
          </p>
        )}
        {step.interactive && el && (
          <p className="mt-2 text-xs font-medium text-brand">
            Anda boleh mencoba langsung pada bagian yang disorot.
          </p>
        )}

        <div
          role="progressbar"
          aria-label="Progres tur"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={number}
          className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"
        >
          <div
            className="h-full rounded-full bg-slate-900 transition-[width] duration-200"
            style={{ width: `${(number / total) * 100}%` }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-semibold text-slate-500 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            Lewati Tur
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onPrev} disabled={number === 1} className={btnSecondary}>
              Sebelumnya
            </button>
            <button type="button" onClick={onNext} className={btnPrimary}>
              {last ? "Selesai" : "Lanjut"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────── Pengendali tur ─────────

export default function ProductTour({ role, initialStatus, initialStepId = null }) {
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const steps = useMemo(() => tourStepsFor(role), [role]);

  const [mode, setMode] = useState(() =>
    initialStatus === TOUR_STATUS.NOT_STARTED
      ? "welcome"
      : initialStatus === TOUR_STATUS.IN_PROGRESS
        ? "resume"
        : "idle"
  );
  const [index, setIndex] = useState(0);
  const [resolved, setResolved] = useState(null); // { id, el, missing }
  const [attempt, setAttempt] = useState(0);
  const [blocked, setBlocked] = useState(false);

  const persistTimer = useRef(null);
  const navRef = useRef("");
  const dirRef = useRef(1);
  const actionsRef = useRef({});

  const step = mode === "running" ? steps[index] : null;

  // Simpan ke metadata akun. Setelah updateUser, sesi di-refresh supaya JWT
  // (yang dibaca server) memuat metadata terbaru; tanpa itu tur bisa muncul lagi
  // saat muat ulang. Gagal menyimpan tidak menghalangi penggunaan aplikasi.
  const persist = useCallback((status, stepId, immediate = false) => {
    clearTimeout(persistTimer.current);
    const run = async () => {
      try {
        const supabase = createClient();
        await supabase.auth.updateUser({ data: { tour: tourMetadata(status, stepId) } });
        await supabase.auth.refreshSession();
      } catch {
        /* abaikan */
      }
    };
    if (immediate) run();
    else persistTimer.current = setTimeout(run, 1000);
  }, []);

  function startTour() {
    dirRef.current = 1;
    setIndex(0);
    setResolved(null);
    setMode("running");
    persist(TOUR_STATUS.IN_PROGRESS, steps[0]?.id ?? null, true);
  }

  function resumeTour() {
    dirRef.current = 1;
    setIndex(resumeIndex(steps, initialStepId));
    setResolved(null);
    setMode("running");
  }

  function finish(status) {
    setMode("idle");
    setResolved(null);
    persist(status, null, true);
  }

  function move(to, dir) {
    dirRef.current = dir;
    setIndex(to);
    persist(TOUR_STATUS.IN_PROGRESS, steps[to].id);
  }

  function goNext() {
    if (index >= steps.length - 1) finish(TOUR_STATUS.COMPLETED);
    else move(index + 1, 1);
  }

  function goPrev() {
    if (index > 0) move(index - 1, -1);
  }

  // Langkah opsional yang elemennya tidak ada: lewati searah perjalanan terakhir.
  function skipMissing() {
    const dir = dirRef.current;
    const to = index + dir;
    if (to < 0) move(Math.min(1, steps.length - 1), 1);
    else if (to >= steps.length) finish(TOUR_STATUS.COMPLETED);
    else move(to, dir);
  }

  useEffect(() => {
    actionsRef.current = { startTour, skipMissing };
  });

  // Mulai ulang dari Pusat Bantuan / Profil.
  useEffect(() => {
    const onStart = () => actionsRef.current.startTour();
    window.addEventListener(START_TOUR_EVENT, onStart);
    return () => window.removeEventListener(START_TOUR_EVENT, onStart);
  }, []);

  // Pindah halaman bila perlu, lalu tunggu elemen target selesai dirender.
  useEffect(() => {
    if (mode !== "running" || !step) return;

    if (pathname !== step.path) {
      const navKey = `${step.id}@${step.path}`;
      if (navRef.current !== navKey) {
        navRef.current = navKey;
        router.push(step.path, { scroll: false });
      }
      // Navigasi tidak pernah sampai (mis. dialihkan): jeda tur, bisa dilanjutkan nanti.
      const t = setTimeout(() => setMode("idle"), 10000);
      return () => clearTimeout(t);
    }

    navRef.current = "";
    let tries = 0;
    const iv = setInterval(() => {
      tries += 1;
      const el = findTarget(step.target);
      if (el) {
        clearInterval(iv);
        setResolved({ id: step.id, el, missing: false });
      } else if (tries >= 30) {
        clearInterval(iv);
        if (step.optional) actionsRef.current.skipMissing();
        else setResolved({ id: step.id, el: null, missing: true });
      }
    }, 120);
    return () => clearInterval(iv);
  }, [mode, step, pathname, router, attempt]);

  // Jeda selama ada pop up aplikasi (mis. konfirmasi draft) supaya tidak bertumpuk.
  useEffect(() => {
    if (mode !== "running") return;
    let raf = 0;
    const check = () => {
      raf = 0;
      setBlocked(Boolean(document.querySelector('[aria-modal="true"]:not([data-tour-ui])')));
    };
    const obs = new MutationObserver(() => {
      if (!raf) raf = requestAnimationFrame(check);
    });
    obs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["aria-modal"],
    });
    raf = requestAnimationFrame(check);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [mode]);

  const onLost = useCallback(() => {
    setResolved(null);
    setAttempt((a) => a + 1);
  }, []);

  if (!mounted) return null;

  if (mode === "welcome") {
    const copy = welcomeCopy(role);
    return (
      <IntroDialog
        id="tour-welcome"
        eyebrow="Pengenalan singkat"
        title={copy.title}
        body={`${copy.body} Tur bisa diulang kapan saja dari Pusat Bantuan atau Profil.`}
        onEscape={() => finish(TOUR_STATUS.SKIPPED)}
      >
        <button type="button" className={btnSecondary} onClick={() => finish(TOUR_STATUS.SKIPPED)}>
          Lewati
        </button>
        <button type="button" className={btnPrimary} onClick={startTour}>
          Mulai Tur
        </button>
      </IntroDialog>
    );
  }

  if (mode === "resume") {
    return (
      <IntroDialog
        id="tour-resume"
        eyebrow="Tur belum selesai"
        title="Lanjutkan tur?"
        body="Anda belum menyelesaikan tur sebelumnya. Lanjutkan dari langkah terakhir, atau mulai dari awal."
        onEscape={() => finish(TOUR_STATUS.SKIPPED)}
      >
        <button type="button" className={btnSecondary} onClick={() => finish(TOUR_STATUS.SKIPPED)}>
          Tutup
        </button>
        <button type="button" className={btnSecondary} onClick={startTour}>
          Mulai dari awal
        </button>
        <button type="button" className={btnPrimary} onClick={resumeTour}>
          Lanjutkan
        </button>
      </IntroDialog>
    );
  }

  if (mode !== "running" || !step || blocked) return null;

  const ready = resolved && resolved.id === step.id ? resolved : null;
  if (!ready) {
    // Menunggu navigasi / render elemen: redupkan halaman agar tidak bisa diklik.
    return <div data-tour-ui aria-hidden="true" className="fixed inset-0 z-[80] bg-slate-900/40" />;
  }

  return (
    <TourLayer
      key={`${step.id}:${attempt}`}
      step={step}
      number={index + 1}
      total={steps.length}
      el={ready.el}
      missing={ready.missing}
      onPrev={goPrev}
      onNext={goNext}
      onSkip={() => finish(TOUR_STATUS.SKIPPED)}
      onLost={onLost}
    />
  );
}
