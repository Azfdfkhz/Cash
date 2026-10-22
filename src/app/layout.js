import localFont from "next/font/local";
import "./globals.css";

// Poppins di-host sendiri (src/app/fonts, lisensi SIL OFL) supaya tampil sama
// di semua browser dan perangkat, tidak bergantung pada jaringan ke Google
// Fonts saat build maupun saat dipakai, dan sejalan dengan CSP `font-src 'self'`.
// Satu keluarga untuk seluruh UI, termasuk angka (nominal, tanggal) di laporan.
const poppins = localFont({
  variable: "--font-poppins",
  display: "swap",
  fallback: ["system-ui", "Arial", "sans-serif"],
  src: [
    { path: "./fonts/poppins-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/poppins-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/poppins-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/poppins-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "./fonts/poppins-latin-800-normal.woff2", weight: "800", style: "normal" },
  ],
});

const SITE_NAME = "Cash Advance dan Reimbursement SharingHappiness";
const SITE_DESCRIPTION =
  "Pengajuan dan realisasi Cash Advance serta Reimbursement SharingHappiness";

export const metadata = {
  applicationName: SITE_NAME,
  title: {
    default: SITE_NAME,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  // Aplikasi internal di balik login: jangan diindeks mesin pencari.
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    title: "SH Cash Advance",
    statusBarStyle: "default",
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    type: "website",
  },
};

// Zoom pengguna sengaja tidak dikunci (tanpa maximumScale): pengguna dengan
// penglihatan terbatas harus bisa memperbesar halaman (WCAG 1.4.4). Isian
// formulir berukuran 16px di mobile, jadi iOS tidak auto-zoom.
export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
