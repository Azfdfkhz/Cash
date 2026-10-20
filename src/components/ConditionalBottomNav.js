"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";

const DETAIL_PATH = /^\/cash-advances\/(?!new)[^/]+/;
// Pengajuan baru: tombol Draft / Kirim menempel di bawah layar menggantikan nav.
const NEW_PATH = /^\/(cash-advances|reimbursements)\/new/;

export default function ConditionalBottomNav({ role, pendingCount, userId }) {
  const pathname = usePathname();
  if (DETAIL_PATH.test(pathname) || NEW_PATH.test(pathname)) return null;
  return <BottomNav role={role} pendingCount={pendingCount} userId={userId} />;
}
