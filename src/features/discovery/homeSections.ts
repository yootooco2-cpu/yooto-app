import type { Merchant } from '@/features/merchants';

import { recommendCached } from './cache';
import { editorialDiversification, rankMerchantsEditorially } from './editorial/editorialScore';
import type { DiscoveryContext } from './types';

// homeSections — EDITORIAL ranking for the Home screen sections ONLY.
//
// Goal: a strong first impression (Airbnb/Apple/Booking) — surface merchants that "sell
// visually" (real photos + attractive categories) and sink the low-appeal ones (élevage,
// toilettage, pompes funèbres, services techniques, no photo / placeholders) WITHOUT
// removing them: they remain in the map, search, /merchants and the full list.
//
// Scope: this module is consumed ONLY by src/app/(tabs)/index.tsx. It does NOT modify the
// Discovery Engine registry/signals, the map, /explore, /merchants, the filters or Mapbox.
//
// Editorial priority now comes from a SINGLE SOURCE: `editorialScore` (editorial/) which
// delegates category appeal to `resolveTier` (editorial/categoryTiers). No term lists live
// here anymore — the previous ATTRACTIVE_TERMS / SENSITIVE_TERMS / SENSITIVE_RAW_CATEGORIES
// duplication has been removed.

// Re-export so existing consumers (index.ts barrel, index.tsx) keep importing `editorialScore`
// from '@/features/discovery' unchanged.
export { editorialScore } from './editorial/editorialScore';

export interface HomeSectionLimits {
  recommendedToday?: number
  nearby?: number
  toDiscover?: number
}

export interface BuildHomeSectionsOptions {
  /** Discovery context — enables the relevance base for « Recommandés aujourd'hui ». */
  context?: DiscoveryContext
  limits?: HomeSectionLimits
}

export interface HomeSections {
  recommendedToday: Merchant[]
  nearby: Merchant[]
  toDiscover: Merchant[]
}

/**
 * Vrai si le corpus porte des distances réellement calculées (position utilisateur + haversine
 * via `withDistance`). C'est la SEULE condition qui autorise un tri « proximité » : sans elle,
 * un tri par `distanceKm` absent (∞ partout) dégénérerait en ordre alphabétique déguisé en
 * proximité — interdit (décision produit 13/07).
 */
export function hasRealDistances(merchants: readonly Merchant[]): boolean {
  return merchants.some((m) => typeof m.distanceKm === 'number' && Number.isFinite(m.distanceKm))
}

/**
 * Build the three Home sections from the SAME merchant list, deduped across sections.
 *
 * PRIMEUR À LA PROXIMITÉ (décision produit 13/07) — « Autour de vous » ouvre la page, donc
 * elle choisit ses commerces EN PREMIER ; « Recommandé aujourd'hui » sélectionne ensuite les
 * meilleurs restants ; « À découvrir » diversifie hors des deux premières.
 *
 * REPLI SANS GÉOLOCALISATION : si aucune distance réelle n'existe, la première section rend
 * un classement ÉDITORIAL (même moteur que le reste de l'app) — jamais un ordre alphabétique
 * présenté comme de la proximité. L'écran adapte alors son intitulé (« Dans votre secteur »).
 */
export function buildHomeSections(merchants: Merchant[], opts: BuildHomeSectionsOptions = {}): HomeSections {
  const limitR = opts.limits?.recommendedToday ?? 8
  const limitN = opts.limits?.nearby ?? 8
  const limitD = opts.limits?.toDiscover ?? 8

  // 1) « Autour de vous » — PREMIER choix. Distances réelles → tri par distance croissante
  //    (nom en tie-break stable). Sans position → repli éditorial assumé.
  const nearby = hasRealDistances(merchants)
    ? [...merchants]
        .sort((a, b) => {
          const da = a.distanceKm ?? Number.POSITIVE_INFINITY
          const db = b.distanceKm ?? Number.POSITIVE_INFINITY
          return da !== db ? da - db : a.name.localeCompare(b.name)
        })
        .slice(0, limitN)
    : rankMerchantsEditorially(merchants).slice(0, limitN)

  // 2) « Recommandé aujourd'hui » : MÊME moteur que Carte/Commerçants — ranking éditorial
  //    (la pertinence ne sert qu'à départager les ex æquo), diversification LÉGÈRE, hors
  //    « Autour de vous » pour ne jamais dupliquer une carte entre les deux premières sections.
  const usedN = new Set<string>(nearby.map((m) => m.id))
  const relevanceBase = (
    opts.context ? recommendCached(merchants, opts.context).map((s) => s.merchant) : merchants
  ).filter((m) => !usedN.has(m.id))
  const recommendedToday = editorialDiversification(rankMerchantsEditorially(relevanceBase), {
    window: limitR,
  }).slice(0, limitR)

  // 3) « À découvrir » : la suite éditoriale (helper unique), hors sections ci-dessus, avec un
  // cap de diversité (max 2 par bucket) pour éviter la monopolisation par les domaines premium.
  const used = new Set<string>([...nearby, ...recommendedToday].map((m) => m.id))
  const candidates = rankMerchantsEditorially(merchants).filter((m) => !used.has(m.id))
  const MAX_PER_BUCKET = 2
  const bucketCount = new Map<Merchant['category'], number>()
  const toDiscover: Merchant[] = []
  for (const m of candidates) {
    if (toDiscover.length >= limitD) break
    const n = bucketCount.get(m.category) ?? 0
    if (n >= MAX_PER_BUCKET) continue
    bucketCount.set(m.category, n + 1)
    toDiscover.push(m)
  }
  // Fallback: fill up to the limit by editorial order if the cap left us short.
  if (toDiscover.length < limitD) {
    const picked = new Set(toDiscover.map((m) => m.id))
    for (const m of candidates) {
      if (toDiscover.length >= limitD) break
      if (!picked.has(m.id)) toDiscover.push(m)
    }
  }

  return { recommendedToday, nearby, toDiscover }
}
