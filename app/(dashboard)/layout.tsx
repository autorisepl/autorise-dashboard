import { Sidebar } from '@/components/layout/sidebar'
import { tokens } from '@/lib/tokens'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', background: tokens.bg.primary }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          overflow: 'auto',
          background: tokens.bg.primary,
          minWidth: 0,
        }}
      >
        {children}
      </main>
    </div>
  )
}
