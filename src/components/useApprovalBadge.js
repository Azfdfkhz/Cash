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

async function fetchCount(userId) {
  if (inflight) return inflight;
  if (lastUserId === userId && lastCount !== null && Date.now() - lastAt < 4000) {
    return lastCount;
  }
  const supabase = createClient();
  inflight = (async () => {
    try {
      const [pending, toDisburse] = await Promise.all([
        supabase
          .from("cash_advances")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .neq("requester_id", userId),
        supabase
          .from("cash_advances")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved")
          .is("disbursed_at", null)
          .neq("requester_id", userId),
      ]);
      if (pending.error || toDisburse.error) return null;
      lastCount = (pending.count ?? 0) + (toDisburse.count ?? 0);
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

export function useApprovalBadge(initialCount, userId, enabled) {
  const pathname = usePathname();
  // Hasil muat ulang dari klien; dibuang begitu server mengirim angka baru
  // (mis. setelah router.refresh()), karena angka server pasti yang terbaru.
  const [fetched, setFetched] = useState(null);
  const [seenInitial, setSeenInitial] = useState(initialCount);
  if (seenInitial !== initialCount) {
    setSeenInitial(initialCount);
    setFetched(null);
  }

  useEffect(() => {
    lastAt = 0;
  }, [initialCount]);

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
