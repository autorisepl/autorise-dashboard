import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--bg)" }}>
      <Sidebar />
      <main
        style={{
          flex: 1,
          minWidth: 0,
          marginLeft: 260,
          height: "100vh",
          overflow: "hidden",
          background: "var(--bg)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
