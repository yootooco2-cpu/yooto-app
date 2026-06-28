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
    // Fallback temporaire sur `name` tant que `search_text`/FTS n'existent pas (Phase B).
    b = b.ilike('name', `%${search}%`);
  }

  const filters = query.filters ?? [];
  if (filters.includes('open')) b = b.eq('is_open_now', true);
  if (filters.includes('producers')) b = b.eq('is_producer', true);
  if (filters.includes('accessible')) b = b.eq('is_accessible', true);
  if (filters.includes('rewards')) b = b.eq('has_rewards', true);

  // `near`/`radiusKm` : distance gérée côté client en Phase A (PostGIS = Phase B).
  return b;
}
