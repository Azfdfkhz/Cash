import { House, Plus, ClipboardCheck, ChartColumn, User, CircleHelp } from "lucide-react";

export const REQUESTER_NAV = [
  { href: "/dashboard", label: "Beranda", icon: House, tour: "nav-home" },
  { href: "/cash-advances/new", label: "Ajukan", icon: Plus, tour: "nav-ajukan", draft: true, also: ["/reimbursements/new"] },
  { href: "/profile", label: "Profil", icon: User, tour: "nav-profile" },
];

export const OPERATIONAL_NAV = [
  { href: "/dashboard", label: "Beranda", icon: House, tour: "nav-home" },
  { href: "/approvals", label: "Persetujuan", icon: ClipboardCheck, tour: "nav-approvals", badge: true },
  { href: "/cash-advances/new", label: "Ajukan", icon: Plus, tour: "nav-ajukan", draft: true, also: ["/reimbursements/new"] },
  { href: "/reports", label: "Laporan", icon: ChartColumn, tour: "nav-reports" },
  { href: "/profile", label: "Profil", icon: User, tour: "nav-profile" },
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
