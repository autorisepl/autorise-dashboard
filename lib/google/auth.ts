import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

// redirectUri może być podany dynamicznie z origin requestu (działa na każdej
// domenie: localhost + app.autorise.pl), z fallbackiem na env.
export function getOAuth2Client(redirectUri?: string) {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri ??
      process.env.GOOGLE_REDIRECT_URI ??
      "http://localhost:3000/api/auth/google/callback",
  );
}

export function getAuthUrl(redirectUri?: string): string {
  const auth = getOAuth2Client(redirectUri);
  return auth.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
  });
}

export function isGoogleConfigured(): boolean {
  return !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
}

export function getRefreshToken(reqCookies?: {
  get: (name: string) => { value: string } | undefined;
}): string | null {
  // Ciasteczko (świeże, z ponownego połączenia użytkownika) MA PRIORYTET nad
  // env. Inaczej nieważny GOOGLE_REFRESH_TOKEN w env blokowałby reconnect
  // (objaw: "połączono" → potem invalid_grant mimo ponownego logowania).
  const cookieToken = reqCookies?.get("google_refresh_token")?.value;
  if (cookieToken) return cookieToken;
  if (process.env.GOOGLE_REFRESH_TOKEN) return process.env.GOOGLE_REFRESH_TOKEN;
  return null;
}

/** Czy błąd to invalid_grant (token wygasł/odwołany → trzeba połączyć ponownie). */
export function isInvalidGrant(err: unknown): boolean {
  const e = err as { response?: { data?: { error?: string } }; message?: string } | undefined;
  if (e?.response?.data?.error === "invalid_grant") return true;
  return typeof e?.message === "string" && e.message.toLowerCase().includes("invalid_grant");
}

export function getAuthenticatedClient(refreshToken: string) {
  const auth = getOAuth2Client();
  auth.setCredentials({ refresh_token: refreshToken });
  return auth;
}

export function getTasksClient(refreshToken: string) {
  const auth = getAuthenticatedClient(refreshToken);
  return google.tasks({ version: "v1", auth });
}

export function getOAuth2UserClient(refreshToken: string) {
  const auth = getAuthenticatedClient(refreshToken);
  return google.oauth2({ version: "v2", auth });
}

export function getSheetsClient(refreshToken: string) {
  const auth = getAuthenticatedClient(refreshToken);
  return google.sheets({ version: "v4", auth });
}

export function getDriveClient(refreshToken: string) {
  const auth = getAuthenticatedClient(refreshToken);
  return google.drive({ version: "v3", auth });
}

export function getCalendarClient(refreshToken: string) {
  const auth = getAuthenticatedClient(refreshToken);
  return google.calendar({ version: "v3", auth });
}
