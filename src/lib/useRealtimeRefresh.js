"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Auto-refresh generik untuk halaman yang menampilkan data Cash Advance /
// Reimbursement (Ajukan, Persetujuan, Laporan, Tim Operasional).
//
// Cara kerja:
// - Berlangganan Supabase Realtime (postgres_changes) untuk tabel yang
//   relevan. RLS Supabase tetap berlaku di jalur Realtime: setiap event hanya
//   diteruskan ke klien yang (menurut policy SELECT) berhak melihat baris itu
//   -- jadi apa yang terlihat tetap sesuai hak akses & filter pengguna.
// - Event HANYA dipakai sebagai sinyal "ada perubahan", bukan sumber data.
//   Begitu ada event, kita panggil `router.refresh()` (di-debounce) supaya
//   Server Component menjalankan query dengan filter/paginasi/RLS yang sama
//   seperti saat render awal -- menghindari tabel, badge status, dan jumlah
//   pengajuan menyimpang dari apa yang sebenarnya berhak dilihat user.
// - Satu channel per komponen yang memanggil hook ini (nama channel diberi
//   suffix acak) supaya tidak bertabrakan dengan subscription lain dan tidak
//   dobel saat beberapa halaman memasang hook ini sekaligus.
// - Saat tab kembali aktif atau koneksi online lagi, dan saat channel gagal
//   konek / jadi CLOSED, kita refresh ulang satu kali sebagai pemulihan --
//   jadi perubahan yang terlewat selagi koneksi putus tetap kelihatan begitu
//   koneksi pulih, tanpa pengguna perlu reload manual.
// - Cleanup lengkap (removeChannel + semua listener) saat unmount atau saat
//   daftar tabel berubah, supaya tidak ada listener yang menumpuk/"bocor".
export function useRealtimeRefresh(tables, { enabled = true, debounceMs = 400 } = {}) {
  const router = useRouter();
  const tableKey = Array.isArray(tables) ? tables.join(",") : String(tables ?? "");

  useEffect(() => {
    if (!enabled || !tableKey) return undefined;

    const list = tableKey.split(",").filter(Boolean);
    if (!list.length) return undefined;

    let cancelled = false;
    let timer = null;
    let channel = null;
    let retryTimer = null;
    let retryDelay = 2000;

    const scheduleRefresh = () => {
      if (cancelled) return;
      clearTimeout(timer);
      // Debounce: beberapa baris berubah sekaligus (mis. insert banyak
      // receipt_lines) cukup memicu satu router.refresh().
      timer = setTimeout(() => {
        if (!cancelled) router.refresh();
      }, debounceMs);
    };

    function subscribe() {
      if (cancelled) return;
      const supabase = createClient();
      const name = `rt-${list.join("-")}-${Math.random().toString(36).slice(2, 8)}`;
      let ch = supabase.channel(name);
      for (const table of list) {
        ch = ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          scheduleRefresh
        );
      }
      channel = ch.subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") {
          retryDelay = 2000; // reset backoff setelah konek sukses
          return;
        }
        // CHANNEL_ERROR / TIMED_OUT / CLOSED: koneksi terputus -- jangan
        // biarkan tanpa subscription aktif. Bersihkan channel lama lalu
        // coba konek ulang dengan backoff, dan pulihkan data yang mungkin
        // terlewat selagi putus.
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          if (channel) {
            supabase.removeChannel(channel);
            channel = null;
          }
          scheduleRefresh();
          clearTimeout(retryTimer);
          retryTimer = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 1.5, 20000);
            subscribe();
          }, retryDelay);
        }
      });
    }

    subscribe();

    // Pemulihan tambahan: tab kembali aktif / jaringan online lagi -- ambil
    // data terbaru walau event Realtime selama tidak aktif terlewat.
    const onRecover = () => {
      if (document.visibilityState === "visible") scheduleRefresh();
    };
    document.addEventListener("visibilitychange", onRecover);
    window.addEventListener("online", onRecover);
    window.addEventListener("focus", scheduleRefresh);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", onRecover);
      window.removeEventListener("online", onRecover);
      window.removeEventListener("focus", scheduleRefresh);
      if (channel) {
        const supabase = createClient();
        supabase.removeChannel(channel);
      }
    };
  }, [tableKey, enabled, debounceMs, router]);
}
