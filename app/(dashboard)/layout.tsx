import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg)" }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: "auto", minWidth: 0, background: "var(--bg)" }}>
        {children}
      </main>
    </div>
  );
}
