// Jednorazowy backfill: część realnych klientów ma adres e-mail wpisany ręcznie do wolnego
// tekstu w "Notatki" (np. "Email: adi.trans@interia.pl"), zamiast do dedykowanej kolumny
// "email" — pole "E-mail" nie istniało dotąd w panelu bocznym Kanbanu jako osobny input, więc
// był to jedyny sposób zapisania tej informacji ręcznie. Od teraz panel ma edytowalne pole
// E-mail (patrz app/(dashboard)/pipeline/page.tsx, EditableField), więc to była historyczna
// luka UI, nie błąd agenta kwalifikacyjnego (który w ogóle nie przechwytuje e-maila —
// patrz lib/agents/prompts.ts, AGENT1_SYSTEM_PROMPT sekcja "DANE KONTAKTOWE").
//
// Ten skrypt: dla każdego rekordu z pustym "email" i niepustym "notatki", szuka wzorca
// "Email: xyz@domain" (albo "E-mail:"/"Mail:", bez uwzględniania wielkości liter) w notatkach,
// przenosi znaleziony adres do kolumny email, i USUWA tę linię z notatki (żeby nie dublować
// informacji w dwóch miejscach).
//
// Wymagania: .env.local musi mieć NEXT_PUBLIC_SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY.
// Użycie:
//   node scripts/backfill-email-from-notatki.mjs           — podgląd (dry-run, nic nie zapisuje)
//   node scripts/backfill-email-from-notatki.mjs --write    — faktyczny zapis
//
// Bezpieczne do uruchomienia wielokrotnie — po przeniesieniu adresu do kolumny email i
// wyczyszczeniu notatki, kolejne uruchomienie nie znajdzie już nic do zrobienia dla tego
// rekordu (email nie jest już pusty).
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envFile = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
function envVar(name) {
  const m = envFile.match(new RegExp(`^${name}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
}

const SUPABASE_URL = envVar("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = envVar("SUPABASE_SERVICE_ROLE_KEY");
const WRITE = process.argv.includes("--write");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Brakuje NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY w .env.local.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// "Email:" / "E-mail:" / "Mail:" (bez rozróżniania wielkości liter), potem sam adres.
const EMAIL_LINE_RE = /^.*(?:e-?mail|mail)\s*:\s*([^\s,;]+@[^\s,;]+\.[^\s,;]+).*$/im;

const { data: rows, error } = await supabase
  .from("pipeline")
  .select("id, firma, email, notatki")
  .is("email", null)
  .not("notatki", "is", null);

if (error) {
  console.error("Błąd odczytu:", error.message);
  process.exit(1);
}

// .is("email", null) pomija puste stringi ("") — dociągnij je osobno.
const { data: emptyStringRows, error: error2 } = await supabase
  .from("pipeline")
  .select("id, firma, email, notatki")
  .eq("email", "")
  .not("notatki", "is", null);
if (error2) {
  console.error("Błąd odczytu (empty string):", error2.message);
  process.exit(1);
}

const candidates = [...(rows ?? []), ...(emptyStringRows ?? [])];
let found = 0;

for (const row of candidates) {
  const match = row.notatki?.match(EMAIL_LINE_RE);
  if (!match) continue;
  const email = match[1];
  const cleanedNotatki = row.notatki.replace(match[0], "").trim();
  found += 1;
  console.log(`${WRITE ? "ZAPIS" : "PODGLĄD"}: ${row.firma} → email="${email}"`);
  if (WRITE) {
    const { error: updateError } = await supabase
      .from("pipeline")
      .update({ email, notatki: cleanedNotatki })
      .eq("id", row.id);
    if (updateError) {
      console.error(`  Błąd zapisu dla ${row.firma}:`, updateError.message);
    }
  }
}

console.log(
  `\n${found} rekordów ${WRITE ? "zaktualizowanych" : "znalezionych (dry-run — uruchom z --write, żeby zapisać)"}.`,
);
