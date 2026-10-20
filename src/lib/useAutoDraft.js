"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveDraft, saveDraftFiles, clearDraft } from "@/lib/draft";

// Simpan draft otomatis:
//  - setiap data berubah (ditunda `delay` ms supaya tidak menulis tiap ketikan)
//  - segera saat halaman disembunyikan / ditutup (pagehide, visibilitychange,
//    beforeunload), koneksi putus (offline), atau komponen dilepas (pindah
//    halaman / error)
//  - segera lewat flush("error") saat pengiriman gagal
// `enabled` harus false sampai draft lama selesai dipulihkan, supaya formulir
// kosong tidak menimpa draft. Setelah pengajuan terkirim panggil `finish()`:
// draft dihapus dan tidak disimpan lagi.
export function useAutoDraft({ kind, data, files, enabled, isMeaningful, delay = 800 }) {
  const latest = useRef({ data, files, enabled, isMeaningful });
  const finished = useRef(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    latest.current = { data, files, enabled, isMeaningful };
  });

  const flush = useCallback(
    (reason = "auto") => {
      const cur = latest.current;
      if (finished.current || !cur.enabled) return false;
      if (cur.isMeaningful && !cur.isMeaningful(cur.data)) return false;
      const ok = saveDraft(kind, cur.data, { reason });
      if (cur.files) saveDraftFiles(kind, cur.files).catch(() => {});
      if (ok) setSavedAt(new Date());
      return ok;
    },
    [kind]
  );

  // Simpan tertunda tiap data / daftar file berubah.
  const signature =
    JSON.stringify(data) + "|" + (files ? files.map((f) => f.key).join(",") : "");
  useEffect(() => {
    if (!enabled) return undefined;
    const t = setTimeout(() => flush("auto"), delay);
    return () => clearTimeout(t);
  }, [signature, enabled, delay, flush]);

  // Simpan segera saat user pergi / jaringan putus / komponen dilepas.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush("auto");
    };
    const onLeave = () => flush("auto");
    const onOffline = () => flush("auto");
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onLeave);
    window.addEventListener("beforeunload", onLeave);
    window.addEventListener("offline", onOffline);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onLeave);
      window.removeEventListener("beforeunload", onLeave);
      window.removeEventListener("offline", onOffline);
      flush("auto");
    };
  }, [flush]);

  // Pengajuan terkirim: hapus draft & berhenti menyimpan.
  const finish = useCallback(() => {
    finished.current = true;
    clearDraft(kind);
    setSavedAt(null);
  }, [kind]);

  // Hapus draft tapi formulir boleh lanjut diisi (mulai dari awal).
  const discard = useCallback(() => {
    clearDraft(kind);
    setSavedAt(null);
  }, [kind]);

  const meaningful = isMeaningful ? isMeaningful(data) : true;
  return { flush, finish, discard, savedAt, meaningful };
}
