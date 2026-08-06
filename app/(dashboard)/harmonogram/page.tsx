import { redirect } from "next/navigation";

// Harmonogram zastąpiony przez /planowanie (jedna zakładka na kalendarz + zadania,
// pełna funkcjonalność tej strony przeniesiona tam 1:1 plus event CRUD).
export default function HarmonogramRedirectPage() {
  redirect("/planowanie");
}
