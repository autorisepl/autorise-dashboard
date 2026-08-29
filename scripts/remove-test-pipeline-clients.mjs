// Usuwa dziewięć kart demonstracyjnych wstawionych przez seed-test-pipeline-clients.mjs
// (Michał, 2026-08-29: "usuń już tych klientów testowych bo nie są potrzebni"). Kasuje po
// jest_testowy:true, tej samej fladze która wyklucza je z liczników biznesowych — nie po
// prefiksie notion_page_id, żeby złapać też ewentualne ręcznie sklonowane karty testowe.
//
// Użycie:
//   node scripts/remove-test-pipeline-clients.mjs
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envFile = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
function envVar(name) {
  const m = envFile.match(new RegExp(`^${name}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
}

const SUPABASE_URL = envVar("NEXT_PUBLIC_SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = envVar("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Brakuje NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY w .env.local.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existing, error: selectError } = await supabase
  .from("pipeline")
  .select("id, firma, status")
  .eq("jest_testowy", true);

if (selectError) {
  console.error("Błąd odczytu:", selectError.message);
  process.exit(1);
}

if (!existing || existing.length === 0) {
  console.log("Brak kart testowych do usunięcia.");
  process.exit(0);
}

console.log(`Usuwam ${existing.length} kart testowych:`);
for (const row of existing) console.log(`  - ${row.firma} (${row.status})`);

const { error: deleteError } = await supabase.from("pipeline").delete().eq("jest_testowy", true);

if (deleteError) {
  console.error("Błąd usuwania:", deleteError.message);
  process.exit(1);
}

console.log("Gotowe.");
