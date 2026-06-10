import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: 'Autorise — Command Center',
  description: 'System agentów sprzedażowych Autorise',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" className={`${GeistSans.variable} ${GeistMono.variable} h-full`}>
      <body style={{ margin: 0, background: '#ffffff', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
