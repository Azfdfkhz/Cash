"use client";

import { useEffect, useState } from "react";
import { DRAFT_EVENT, DRAFT_KINDS, getDraftInfo } from "@/lib/draft";

// Ada draft pengajuan yang belum dikirim di perangkat ini? Dipakai untuk
// penanda "Draft" di menu Ajukan. Awalnya false (sama dengan render server),
// lalu dibaca dari penyimpanan lokal dan diperbarui tiap draft berubah.
export function useHasDraft() {
  const [state, setState] = useState({ cash_advance: false, reimbursement: false });

  useEffect(() => {
    const read = () => {
      const next = {};
      for (const k of DRAFT_KINDS) next[k] = Boolean(getDraftInfo(k));
      setState(next);
    };
    read();
    window.addEventListener(DRAFT_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(DRAFT_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  return { ...state, any: state.cash_advance || state.reimbursement };
}
