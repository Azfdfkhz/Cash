"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Layout (Sidebar & BottomNav) tidak dirender ulang saat pindah halaman, jadi
// angka dari server cepat basi. Hook ini memuat ulang jumlah pengajuan yang
// butuh tindakan: saat pindah halaman, saat tab kembali aktif, dan tiap 30
// detik. Sidebar & BottomNav sama-sama terpasang, jadi permintaan digabung.
let inflight = null;
let lastAt = 0;
let lastCount = null;
let lastUserId = null;

const EMPTY = { total: 0, cash_advance: 0, reimbursement: 0 };

async function fetchCount(userId) {
  if (inflight) return inflight;
  if (lastUserId === userId && lastCount !== null && Date.now() - lastAt < 4000) {
    return lastCount;
  }
  const supabase = createClient();
  inflight = (async () => {
    try {
      const count = (kind, toDisburse) => {
        let q = supabase
          .from("cash_advances")
          .select("id", { count: "exact", head: true })
          .eq("kind", kind)
          .neq("requester_id", userId);
        return toDisburse
          ? q.eq("status", "approved").is("disbursed_at", null)
          : q.eq("status", "pending");
      };
      const [caP, caD, reP, reD] = await Promise.all([
        count("cash_advance", false),
        count("cash_advance", true),
        count("reimbursement", false),
        count("reimbursement", true),
      ]);
      if (caP.error || caD.error || reP.error || reD.error) return null;
      const cash_advance = (caP.count ?? 0) + (caD.count ?? 0);
      const reimbursement = (reP.count ?? 0) + (reD.count ?? 0);
      lastCount = { total: cash_advance + reimbursement, cash_advance, reimbursement };
      lastAt = Date.now();
      lastUserId = userId;
      return lastCount;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// Mengembalikan { total, cash_advance, reimbursement }.
export function useApprovalBadge(initial, userId, enabled) {
  const initialCount = initial ?? EMPTY;
  const initialKey = `${initialCount.cash_advance}-${initialCount.reimbursement}`;
  const pathname = usePathname();
  // Hasil muat ulang dari klien; dibuang begitu server mengirim angka baru
  // (mis. setelah router.refresh()), karena angka server pasti yang terbaru.
  const [fetched, setFetched] = useState(null);
  const [seenInitial, setSeenInitial] = useState(initialKey);
  if (seenInitial !== initialKey) {
    setSeenInitial(initialKey);
    setFetched(null);
  }

  useEffect(() => {
    lastAt = 0;
  }, [initialKey]);

  useEffect(() => {
    if (!enabled || !userId) return undefined;
    let cancelled = false;
    const run = async () => {
      const c = await fetchCount(userId);
      if (!cancelled && c !== null) setFetched(c);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") run();
    };
    run();
    const timer = setInterval(run, 30000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", run);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", run);
    };
  }, [pathname, userId, enabled]);

  return fetched ?? initialCount;
}
