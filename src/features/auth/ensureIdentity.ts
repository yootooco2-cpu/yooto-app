import { getSupabaseClient } from '@/lib/supabase/client';

/**
 * Matérialise une identité si aucune n'existe (invariant du User Data Store, ADR-001) :
 * la 1re donnée utilisateur possédée persistée → session ANONYME Supabase, invisible.
 * Passe par `getSupabaseClient` (aucun accès direct à supabase-js). Non bloquant :
 * renvoie `false` si indisponible/offline → l'appelant reste en local-first.
 */
export async function ensureIdentity(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) return true;
    const { error } = await supabase.auth.signInAnonymously();
    return !error;
  } catch {
    return false;
  }
}
