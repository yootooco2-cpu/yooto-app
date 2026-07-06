import { getSupabaseClient } from '@/lib/supabase/client';

/**
 * Accès données des favoris (serveur) — via l'abstraction `getSupabaseClient` uniquement.
 * Non bloquant : si Supabase indisponible/non configuré, `pull` renvoie `null` et `push`
 * renvoie `false` → le store reste en local-first (fallback).
 */

/** Liste les ids de commerces favoris ACTIFS de l'utilisateur courant. `null` si indisponible. */
export async function pullFavorites(): Promise<string[] | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('merchant_id')
      .eq('state', 'active');
    if (error || !data) return null;
    return data.map((row) => String((row as { merchant_id: string }).merchant_id));
  } catch {
    return null;
  }
}

/** Écrit un favori (LWW serveur via RPC). `true` si confirmé serveur. */
export async function pushFavorite(merchantId: string, active: boolean): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.rpc('set_favorite', {
      p_merchant: merchantId,
      p_state: active ? 'active' : 'removed',
      p_client_ts: new Date().toISOString(),
    });
    return !error;
  } catch {
    return false;
  }
}
