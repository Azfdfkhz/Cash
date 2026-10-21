"use client";

import { useCallback, useState } from "react";
import { closeModal, isModalOpen, openModal } from "@/lib/modalState";

// Hook di atas aturan "satu modal aktif" (lihat modalState.js).
//   const modals = useModalState();
//   modals.open("scan");            // menggantikan modal lain yang terbuka
//   modals.close("scan");           // hanya menutup bila "scan" yang aktif
//   modals.close();                 // menutup modal apa pun yang aktif
//   modals.isOpen("scan");
//   modals.active                   // null | { name, ...params }
export function useModalState(initial = null) {
  const [active, setActive] = useState(initial);
  const open = useCallback(
    (name, params) => setActive((cur) => openModal(cur, name, params)),
    []
  );
  const close = useCallback((name) => setActive((cur) => closeModal(cur, name)), []);
  const isOpen = useCallback((name) => isModalOpen(active, name), [active]);
  return { active, open, close, isOpen };
}
