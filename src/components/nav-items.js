import { House, Plus, ClipboardCheck, ChartColumn, User, CircleHelp } from "lucide-react";

export const REQUESTER_NAV = [
  { href: "/dashboard", label: "Beranda", icon: House },
  { href: "/cash-advances/new", label: "Ajukan", icon: Plus, draft: true, also: ["/reimbursements/new"] },
  { href: "/profile", label: "Profil", icon: User },
];

export const OPERATIONAL_NAV = [
  { href: "/dashboard", label: "Beranda", icon: House },
  { href: "/approvals", label: "Persetujuan", icon: ClipboardCheck, badge: true },
  { href: "/cash-advances/new", label: "Ajukan", icon: Plus, draft: true, also: ["/reimbursements/new"] },
  { href: "/reports", label: "Laporan", icon: ChartColumn },
  { href: "/profile", label: "Profil", icon: User },
];

// Bantuan tampil di sidebar desktop dan top bar mobile (bukan di bottom nav,
// supaya bar bawah tidak sesak).
export const HELP_NAV = { href: "/help", label: "Bantuan", icon: CircleHelp };

export function navFor(role) {
  return role === "operational" ? OPERATIONAL_NAV : REQUESTER_NAV;
}

export function isActive(pathname, href, also = []) {
  return [href, ...also].some(
    (h) => pathname === h || pathname.startsWith(`${h}/`)
  );
}
