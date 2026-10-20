"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Tanya user sebelum meninggalkan formulir yang sudah terisi (pindah menu,
// klik tautan, tombol kembali, tombol back browser). Saat `active`, aksi
// keluar ditahan dan `pending` terisi; tampilkan dialog, lalu panggil
// `confirmLeave()` (lanjut keluar) atau `cancelLeave()` (tetap di formulir).
// Tutup tab / refresh / jaringan putus tidak bisa ditahan: itu ditangani
// penyimpanan draft otomatis (useAutoDraft).
export function useLeaveGuard(active) {
  const router = useRouter();
  const [pending, setPending] = useState(null);
  const activeRef = useRef(active);
  const pushed = useRef(false);
  const leaving = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // Klik tautan internal.
  useEffect(() => {
    const onClick = (e) => {
      if (!activeRef.current || leaving.current || e.defaultPrevented) return;
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setPending({ type: "href", href: url.pathname + url.search + url.hash });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Tombol back browser / HP: sisipkan satu entri riwayat sebagai "penahan".
  useEffect(() => {
    if (active && !pushed.current) {
      window.history.pushState(window.history.state, "", window.location.href);
      pushed.current = true;
    }
  }, [active]);

  useEffect(() => {
    const onPop = () => {
      if (leaving.current) return;
      if (!activeRef.current) {
        // Tidak ada isian lagi: buang entri penahan supaya back terasa normal.
        if (pushed.current) {
          pushed.current = false;
          leaving.current = true;
          window.history.back();
        }
        return;
      }
      window.history.pushState(window.history.state, "", window.location.href);
      setPending({ type: "back" });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Tombol kembali di header formulir.
  const requestBack = useCallback(() => {
    if (activeRef.current) setPending({ type: "back" });
    else router.back();
  }, [router]);

  const confirmLeave = useCallback(() => {
    const target = pending;
    setPending(null);
    leaving.current = true;
    if (target?.type === "href") router.push(target.href);
    else window.history.go(pushed.current ? -2 : -1);
  }, [pending, router]);

  const cancelLeave = useCallback(() => setPending(null), []);

  return { pending: Boolean(pending), requestBack, confirmLeave, cancelLeave };
}
