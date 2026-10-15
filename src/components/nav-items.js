import { House, Plus, ClipboardCheck, ChartColumn, User } from "lucide-react";

export const REQUESTER_NAV = [
  { href: "/dashboard", label: "Beranda", icon: House },
  { href: "/cash-advances/new", label: "Ajukan", icon: Plus },
  { href: "/profile", label: "Profil", icon: User },
];

export const OPERATIONAL_NAV = [
  { href: "/dashboard", label: "Beranda", icon: House },
  { href: "/approvals", label: "Persetujuan", icon: ClipboardCheck, badge: true },
  { href: "/cash-advances/new", label: "Ajukan", icon: Plus },
  { href: "/reports", label: "Laporan", icon: ChartColumn },
  { href: "/profile", label: "Profil", icon: User },
];

export function navFor(role) {
  return role === "operational" ? OPERATIONAL_NAV : REQUESTER_NAV;
}

export function isActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
