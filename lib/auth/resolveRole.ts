import { jwtDecode } from "jwt-decode";

export type Role = "admin" | "setter" | "closer";

export interface Identity {
  role: Role;
  teamMemberId: string;
  displayName: string;
}

interface AccessTokenPayload {
  app_metadata?: {
    team_member_id?: string;
    team_role?: string;
    team_display_name?: string;
  };
}

function isRole(value: string | undefined): value is Role {
  return value === "admin" || value === "setter" || value === "closer";
}

// Rola i tożsamość osoby nie żyją w kodzie — leżą w Supabase (tabele team_members /
// team_member_emails) i trafiają do sesji wyłącznie przez Custom Access Token hook jako
// app_metadata.team_member_id / .team_role / .team_display_name NA SAMYM TOKENIE (JWT).
//
// Pułapka: te claimsy NIE są widoczne w supabase.auth.getUser().data.user.app_metadata —
// hook dopisuje je do wystawianego JWT, nie do rekordu usera w bazie Auth. Trzeba je czytać
// z session.access_token, zdekodowanego lokalnie (getUser() już zwalidował podpis u Supabase,
// więc tu tylko odczytujemy payload, bez ponownej weryfikacji).
//
// null = e-mail logowania nie ma wpisu w team_member_emails (albo hook z innego powodu nie
// dopisał kompletu claimsów) — proxy.ts traktuje to jak niezalogowanego.
export function resolveIdentity(accessToken: string | null | undefined): Identity | null {
  if (!accessToken) return null;

  let payload: AccessTokenPayload;
  try {
    payload = jwtDecode<AccessTokenPayload>(accessToken);
  } catch {
    return null;
  }

  const { team_member_id, team_role, team_display_name } = payload.app_metadata ?? {};
  if (!team_member_id || !team_role || !team_display_name) return null;
  if (!isRole(team_role)) return null;

  return { role: team_role, teamMemberId: team_member_id, displayName: team_display_name };
}

export function resolveRole(accessToken: string | null | undefined): Role | null {
  return resolveIdentity(accessToken)?.role ?? null;
}

// Jedna mapa etykiet dla wszystkich miejsc pokazujących rolę użytkownikowi (profil,
// sidebar) — żeby dodanie kolejnej roli wymagało zmiany w jednym miejscu, nie kilku
// osobnych ternary rozjeżdżających się przy każdej nowej wartości Role.
export const ROLE_LABELS: Record<Role, string> = {
  admin: "Founder",
  setter: "Setter",
  closer: "Closer",
};

// Kolory odznaki rangi (karta użytkownika w sidebarze) — każda rola dostaje własny,
// od razu rozpoznawalny kolor zamiast jednolitego szarego tekstu. Reużywa istniejących
// par bg/border/text z design systemu (ten sam wzorzec co status Pipeline), nie wymyśla
// nowej palety tylko dla tego jednego miejsca.
export const ROLE_COLORS: Record<Role, { bg: string; border: string; text: string }> = {
  admin: {
    bg: "var(--brand-blue-bg)",
    border: "var(--brand-blue-border)",
    text: "var(--brand-blue-text)",
  },
  closer: { bg: "var(--warning-bg)", border: "var(--warning-border)", text: "var(--warning-text)" },
  setter: { bg: "var(--success-bg)", border: "var(--success-border)", text: "var(--success-text)" },
};
