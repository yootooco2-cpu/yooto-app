import type { Merchant } from '@/features/merchants';

import { recommendCached } from './cache';
import { editorialScore } from './editorial/editorialScore';
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
  nearbyProducers?: number
  toDiscover?: number
}

export interface BuildHomeSectionsOptions {
  /** Discovery context — enables the relevance base for « Recommandés aujourd'hui ». */
  context?: DiscoveryContext
  limits?: HomeSectionLimits
}

export interface HomeSections {
  recommendedToday: Merchant[]
  nearbyProducers: Merchant[]
  toDiscover: Merchant[]
}

/**
 * Build the three Home sections from the SAME merchant list, deduped across sections.
 * Editorial ordering everywhere; « Recommandés » keeps the Discovery Engine relevance as a
 * base pool, then re-ranked editorially so the first impression is always premium.
 */
export function buildHomeSections(merchants: Merchant[], opts: BuildHomeSectionsOptions = {}): HomeSections {
  const limitR = opts.limits?.recommendedToday ?? 8
  const limitP = opts.limits?.nearbyProducers ?? 8
  const limitD = opts.limits?.toDiscover ?? 8

  // Precompute once (deterministic + avoids repeated work in comparators).
  const scoreOf = new Map<string, number>()
  for (const m of merchants) scoreOf.set(m.id, editorialScore(m))
  const score = (m: Merchant): number => scoreOf.get(m.id) ?? 0

  const byEditorial = (a: Merchant, b: Merchant): number => {
    const d = score(b) - score(a)
    return d !== 0 ? d : a.name.localeCompare(b.name)
  }

  // « Recommandés » : relevance pool (engine) re-ranked editorially. Fallback to all
  // merchants when no context is provided.
  const relevanceBase = opts.context
    ? recommendCached(merchants, opts.context, { limit: Math.max(limitR * 3, 24) }).map((s) => s.merchant)
    : merchants
  const recommendedToday = [...relevanceBase].sort(byEditorial).slice(0, limitR)

  // « Producteurs proches » : producers by editorial score, distance as tie-break.
  const producers = merchants.filter((m) => m.isProducer || m.category === 'producer')
  const nearbyProducers = [...producers]
    .sort((a, b) => {
      const d = score(b) - score(a)
      if (d !== 0) return d
      const da = a.distanceKm ?? Number.POSITIVE_INFINITY
      const db = b.distanceKm ?? Number.POSITIVE_INFINITY
      return da !== db ? da - db : a.name.localeCompare(b.name)
    })
    .slice(0, limitP)

  // « À découvrir » : the next best editorially, excluding the two sections above, with a
  // diversity cap (max 2 per bucket) so premium producers/domaines don't monopolize it.
  const used = new Set<string>([...recommendedToday, ...nearbyProducers].map((m) => m.id))
  const candidates = [...merchants].sort(byEditorial).filter((m) => !used.has(m.id))
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

  return { recommendedToday, nearbyProducers, toDiscover }
}
