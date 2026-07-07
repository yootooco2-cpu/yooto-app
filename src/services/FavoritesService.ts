import { getSupabaseClient } from '@/lib/supabase/client';

import { pullFavorites, pushFavorite } from '@/features/favorites/favoritesSource';

/**
 * Service de FAVORIS — persistance côté Supabase (table `favorites`, RPC `set_favorite` : LWW,
 * PK (profile_id, merchant_id) → pas de doublon). SEUL point d'accès données pour les favoris
 * (les composants n'appellent jamais Supabase directement). Renvoie des booléens de confirmation ;
 * l'état réactif de l'UI vit dans `favoritesStore`.
 */
export const FavoritesService = {
  /** Ce commerce est-il un favori ACTIF côté serveur ? */
  async isFavorite(merchantId: string): Promise<boolean> {
    const supabase = getSupabaseClient();
    if (!supabase) return false;
    try {
      const { data } = await supabase
        .from('favorites')
        .select('merchant_id')
        .eq('merchant_id', merchantId)
        .eq('state', 'active')
        .maybeSingle();
      return !!data;
    } catch {
      return false;
    }
  },

  /** Ajoute le commerce aux favoris. `true` si confirmé serveur. */
  addFavorite(merchantId: string): Promise<boolean> {
    return pushFavorite(merchantId, true);
  },

  /** Retire le commerce des favoris. `true` si confirmé serveur. */
  removeFavorite(merchantId: string): Promise<boolean> {
    return pushFavorite(merchantId, false);
  },

  /** Écrit l'état favori voulu. `true` si confirmé serveur. */
  setFavorite(merchantId: string, active: boolean): Promise<boolean> {
    return pushFavorite(merchantId, active);
  },

  /** Bascule l'état serveur et renvoie le nouvel état. */
  async toggleFavorite(merchantId: string): Promise<{ ok: boolean; active: boolean }> {
    const current = await this.isFavorite(merchantId);
    const ok = await pushFavorite(merchantId, !current);
    return { ok, active: !current };
  },

  /** Liste des ids favoris actifs (`null` si indisponible). */
  listFavoriteIds(): Promise<string[] | null> {
    return pullFavorites();
  },
};
