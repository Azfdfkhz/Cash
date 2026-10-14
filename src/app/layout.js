import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  applicationName: "Cash Advance",
  title: {
    default: "Cash Advance",
    template: "%s · Cash Advance",
  },
  description: "Pencatatan pengajuan dan realisasi Cash Advance",
  appleWebApp: {
    capable: true,
    title: "Cash Advance",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Cash Advance",
    description: "Pencatatan pengajuan dan realisasi Cash Advance",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2563eb",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
