"use client";

import { useSyncExternalStore } from "react";

// Penanda global kecil: "tur sedang berjalan". Halaman (mis. Beranda) membacanya
// untuk menampilkan data CONTOH bila daftar aslinya kosong. Hanya di memori
// browser: tidak ada yang disimpan ke database maupun localStorage.

let active = false;
const subs = new Set();

export function setTourDemo(value) {
  const next = Boolean(value);
  if (active === next) return;
  active = next;
  subs.forEach((fn) => fn());
}

function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

export function useTourDemo() {
  return useSyncExternalStore(subscribe, () => active, () => false);
}
