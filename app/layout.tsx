import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { ThemeProvider } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "Autorise — Dashboard",
  description: "System agentów sprzedażowych Autorise",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pl"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Anti-flash: set theme before React hydration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('autorise-theme');document.documentElement.setAttribute('data-theme',t||'dark')})()`,
          }}
        />
      </head>
      <body style={{ margin: 0, minHeight: "100vh" }}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
