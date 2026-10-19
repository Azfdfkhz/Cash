import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata = {
  applicationName: "Cash Advance dan Reimbursement SharingHappiness",
  title: {
    default: "Cash Advance dan Reimbursement SharingHappiness",
    template: "%s · Cash Advance dan Reimbursement SharingHappiness",
  },
  description:
    "Pengajuan dan realisasi Cash Advance serta Reimbursement SharingHappiness",
  appleWebApp: {
    capable: true,
    title: "SH Cash Advance",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Cash Advance dan Reimbursement SharingHappiness",
    description:
      "Pengajuan dan realisasi Cash Advance serta Reimbursement SharingHappiness",
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
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
