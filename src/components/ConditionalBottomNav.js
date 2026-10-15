"use client";

import { usePathname } from "next/navigation";
import BottomNav from "@/components/BottomNav";

const DETAIL_PATH = /^\/cash-advances\/(?!new)[^/]+/;

export default function ConditionalBottomNav({ role, pendingCount }) {
  const pathname = usePathname();
  if (DETAIL_PATH.test(pathname)) return null;
  return <BottomNav role={role} pendingCount={pendingCount} />;
}
