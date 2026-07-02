import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Roboto } from "next/font/google";
import type { Metadata, Viewport } from "next";
import "./globals.css";

const roboto = Roboto({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-roboto",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Autorise — Dashboard",
  description: "System agentów sprzedażowych Autorise",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pl"
      data-theme="light"
      className={`${GeistSans.variable} ${GeistMono.variable} ${roboto.variable} h-full`}
    >
      <body style={{ margin: 0, minHeight: "100vh" }}>{children}</body>
    </html>
  );
}
