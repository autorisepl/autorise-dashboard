"use client";

import { createContext, useContext } from "react";
import type { Role } from "@/lib/auth/resolveRole";

const RoleContext = createContext<Role | null>(null);

// Rola przychodzi jako initial value z server-side layoutu (cookie odczytane
// przez next/headers przed pierwszym renderem), nie dociągana asynchronicznie
// po stronie klienta — eliminuje to okno w którym setter widzi pełną nawigację
// admina zanim fetch do /api/auth/me zdąży wrócić.
export function RoleProvider({
  role,
  children,
}: {
  role: Role | null;
  children: React.ReactNode;
}) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

export function useRole(): Role | null {
  return useContext(RoleContext);
}
