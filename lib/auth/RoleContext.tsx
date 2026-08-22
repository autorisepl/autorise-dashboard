"use client";

import { createContext, useContext } from "react";
import type { Identity, Role } from "@/lib/auth/resolveRole";

const IdentityContext = createContext<Identity | null>(null);

// Tożsamość przychodzi jako initial value z server-side layoutu (cookie odczytane
// przez next/headers przed pierwszym renderem), nie dociągana asynchronicznie
// po stronie klienta — eliminuje to okno w którym setter widzi pełną nawigację
// admina zanim fetch do /api/auth/me zdąży wrócić.
export function RoleProvider({ role, children }: { role: Identity | null; children: React.ReactNode }) {
  return <IdentityContext.Provider value={role}>{children}</IdentityContext.Provider>;
}

// Pełna tożsamość (rola + teamMemberId + displayName) — sidebar i /profil.
export function useIdentity(): Identity | null {
  return useContext(IdentityContext);
}

// Sama rola — dotychczasowy selektor, zostaje dla miejsc które potrzebują tylko jej
// (agenci/page.tsx, kwalifikacja/page.tsx), żeby ich nie ruszać przy tej zmianie.
export function useRole(): Role | null {
  return useIdentity()?.role ?? null;
}
