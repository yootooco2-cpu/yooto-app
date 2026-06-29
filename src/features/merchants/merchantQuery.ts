import { formatDistanceLabel, haversineKm } from '@/lib/geo/haversine';
import type { MapCoordinate } from '@/features/map';
import type { SupabaseSelectBuilder } from '@/lib/supabase/datasource';

import type { Merchant, MerchantQuery } from './types';
import type { QuickFilterId } from './filters';

/**
 * Sémantique de requête commerces — définie UNE fois, déclinée en deux exécutions :
 * - `applyMerchantQueryLocal` (JS, fallback local + données de démo)
 * - `buildSupabaseMerchantQuery` (PostgREST, serveur)
 * Les garder côte à côte limite la dérive de comportement local/serveur.
 */

function matchesText(merchant: Merchant, search?: string): boolean {
  const q = search?.trim().toLowerCase();
  if (!q) return true;
  return `${merchant.name} ${merchant.description}`.toLowerCase().includes(q);
}

function matchesFilters(merchant: Merchant, filters?: QuickFilterId[]): boolean {
  if (!filters || filters.length === 0) return true;
  if (filters.includes('open') && !merchant.isOpenNow) return false;
  if (filters.includes('producers') && !merchant.isProducer) return false;
  if (filters.includes('accessible') && !merchant.isAccessible) return false;
  if (filters.includes('rewards') && !merchant.hasRewards) return false;
  // 'nearby' n'est pas un prédicat booléen : il déclenche seulement le tri distance.
  return true;
}

/** Dérive `distanceKm`/`distanceLabel`, filtre par rayon et trie (si `near`). */
export function withDistance(
  merchants: Merchant[],
  near?: MapCoordinate,
  radiusKm?: number,
): Merchant[] {
  if (!near) return merchants;

  const enriched = merchants.map((merchant) => {
    const distanceKm = haversineKm(near, merchant.coordinates);
    return { ...merchant, distanceKm, distanceLabel: formatDistanceLabel(distanceKm) };
  });

  const filtered =
    typeof radiusKm === 'number'
      ? enriched.filter((merchant) => (merchant.distanceKm ?? Infinity) <= radiusKm)
      : enriched;

  return filtered.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
}

/** Exécution LOCALE : recherche + filtres + distance sur un tableau en mémoire. */
export function applyMerchantQueryLocal(
  merchants: Merchant[],
  query?: MerchantQuery,
): Merchant[] {
  const base = merchants.filter(
    (merchant) => matchesText(merchant, query?.search) && matchesFilters(merchant, query?.filters),
  );
  return withDistance(base, query?.near, query?.radiusKm);
}

/** Exécution SERVEUR : traduit les critères en filtres PostgREST. */
export function buildSupabaseMerchantQuery(
  builder: SupabaseSelectBuilder,
  query: MerchantQuery,
): SupabaseSelectBuilder {
  let b = builder;

  const search = query.search?.trim();
  if (search) {
    // Colonne UNIQUE → jamais de `.or()` avec texte utilisateur (anti-injection).
    b = b.ilike('name', `%${search}%`);
  }

  // NB : les filtres booléens (is_open_now/is_producer/is_accessible) NE SONT PAS
  // appliqués ici — ces colonnes n'existent pas dans la table réelle (erreur 42703).
  // Ils sont gérés côté client (applyMerchantQueryLocal), de même que la distance.
  return b;
}
