import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "System Autorise — Panel zlecenia",
  description: "Panel zlecenia, moduł monitorowania Autorise",
};

export default function DemoArekLayout({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: "100vh" }}>{children}</div>;
}
