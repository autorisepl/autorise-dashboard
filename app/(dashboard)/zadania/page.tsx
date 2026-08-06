import { redirect } from "next/navigation";

// Zadania zastąpione przez /planowanie (jedna zakładka na kalendarz + zadania,
// pełna funkcjonalność tej strony przeniesiona tam 1:1: CRUD zadań, add/edit/delete, listy).
export default function ZadaniaRedirectPage() {
  redirect("/planowanie");
}
