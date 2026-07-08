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
 * Build the three Home sections from the SAME merchant list, deduped across sections.
 * Editorial ordering everywhere; « Recommandés » keeps the Discovery Engine relevance as a
 * base pool, then re-ranked editorially so the first impression is always premium.
 */
export function buildHomeSections(merchants: Merchant[], opts: BuildHomeSectionsOptions = {}): HomeSections {
  const limitR = opts.limits?.recommendedToday ?? 8
  const limitN = opts.limits?.nearby ?? 8
  const limitD = opts.limits?.toDiscover ?? 8

  // « Recommandés » : MÊME moteur que Carte/Commerçants — ranking éditorial sur TOUT le corpus
  // (la pertinence ne sert qu'à départager les ex æquo), PUIS diversification LÉGÈRE de la vitrine.
  // Plus de pré-filtre `limit` (ancien pipeline parallèle qui remontait des traiteurs hors éditorial).
  const relevanceBase = opts.context
    ? recommendCached(merchants, opts.context).map((s) => s.merchant)
    : merchants
  const recommendedToday = editorialDiversification(rankMerchantsEditorially(relevanceBase), {
    window: limitR,
  }).slice(0, limitR)

  // « À proximité » : les commerces les PLUS PROCHES, tous commerces confondus (plus de filtre
  // producteurs). Tri par distance croissante (nom en tie-break), hors « Recommandés » pour ne
  // jamais dupliquer une carte entre les deux premières sections.
  const usedR = new Set<string>(recommendedToday.map((m) => m.id))
  const nearby = [...merchants]
    .filter((m) => !usedR.has(m.id))
    .sort((a, b) => {
      const da = a.distanceKm ?? Number.POSITIVE_INFINITY
      const db = b.distanceKm ?? Number.POSITIVE_INFINITY
      return da !== db ? da - db : a.name.localeCompare(b.name)
    })
    .slice(0, limitN)

  // « À découvrir » : la suite éditoriale (helper unique), hors sections ci-dessus, avec un cap
  // de diversité (max 2 par bucket) pour éviter la monopolisation par les domaines premium.
  const used = new Set<string>([...recommendedToday, ...nearby].map((m) => m.id))
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
