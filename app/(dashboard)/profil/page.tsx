import { ROLE_LABELS, resolveIdentity } from "@/lib/auth/resolveRole";
import { createClient } from "@/lib/supabase/server";
import { ProfilContent } from "./ProfilContent";

export default async function ProfilPage() {
  const supabase = await createClient();
  // Sama walidacja JWT (getUser()) już się odbyła w proxy.ts dla tego requestu — tu
  // wystarczy odczytać sesję z ciasteczek po access_token z claimsami tożsamości.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const identity = resolveIdentity(session?.access_token);

  return (
    <ProfilContent
      displayName={identity?.displayName ?? "Nieznany użytkownik"}
      roleLabel={identity ? ROLE_LABELS[identity.role] : "Brak roli"}
      email={session?.user?.email ?? "—"}
    />
  );
}
