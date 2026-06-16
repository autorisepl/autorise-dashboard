import { Sidebar } from '@/components/layout/sidebar'
import { tokens } from '@/lib/tokens'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#f0f4ff' }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          overflow: 'auto',
          background: '#f0f4ff',
          minWidth: 0,
        }}
      >
        {children}
      </main>
    </div>
  )
}
