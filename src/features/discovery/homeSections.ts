import { getMerchantCoverPhoto, type Merchant } from '@/features/merchants';

import { recommendCached } from './cache';
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
// Defensive & pure: no invented data (missing photo/rating → lower score, never faked),
// deterministic (stable tie-breaks). Category buckets are coarse (5 values) so appeal is
// refined with keyword matching on name + description.

// ── Editorial weights (validated: strong priority on real photo & category appeal) ──────
const W = {
  realPhoto: 60,
  noPhotoPenalty: -60,
  attractiveCategory: 30,
  sensitivePenalty: -80,
  serviceBucketPenalty: -30,
  producer: 10,
  premiumProducer: 22,
  openNow: 6,
  ratingScale: 8,
  ratingPivot: 3.5,
  ratingClamp: 14,
  lowConfidenceReviews: 5,
} as const

// Bucket-level nudges (used only when no keyword matched).
const BUCKET_NUDGE: Record<Merchant['category'], number> = {
  restaurant: 14,
  grocery: 10,
  producer: 8,
  shop: 4,
  service: W.serviceBucketPenalty,
}

// Attractive, "sells the first impression" keywords (name + description, accent-free).
const ATTRACTIVE_TERMS = [
  'cafe',
  'torrefaction',
  'boulangerie',
  'patisserie',
  'restaurant',
  'bistrot',
  'brasserie',
  'caviste',
  'chocolatier',
  'glacier',
  'epicerie fine',
  'epicerie',
  'primeur',
  'fromagerie',
  'traiteur',
  'fleuriste',
] as const

// Quality-producer keywords (extra bonus on top of the producer base).
const PREMIUM_PRODUCER_TERMS = ['domaine', 'vignoble', 'vigneron', 'viticulteur'] as const

// Low-appeal / sensitive keywords for a discovery feed (penalty, never removal).
const SENSITIVE_TERMS = [
  'elevage',
  'toilettage',
  'pompe funebre',
  'pompes funebres',
  'funeraire',
  'service technique',
  'services techniques',
  'depannage',
  'plomberie',
  'serrurerie',
  'garage',
  'reparation',
] as const

/** Accent-insensitive, lowercased. */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function hasRealPhoto(merchant: Merchant): boolean {
  return getMerchantCoverPhoto(merchant) !== null
}

/**
 * Editorial "first impression" score for a merchant. Higher = surface higher. Pure &
 * additive so ordering stays explainable and testable.
 */
export function editorialScore(merchant: Merchant): number {
  const haystack = normalize(`${merchant.name} ${merchant.description}`)
  let score = 0

  // 1. Real photo — the strongest lever both ways.
  if (hasRealPhoto(merchant)) score += W.realPhoto
  else score += W.noPhotoPenalty

  // 2/4. Category appeal. Sensitive wins over everything; else attractive keyword; else a
  // bucket-level nudge (so a photo-less "service" merchant still sinks).
  const isSensitive = SENSITIVE_TERMS.some((t) => haystack.includes(t))
  const isAttractive = ATTRACTIVE_TERMS.some((t) => haystack.includes(t))
  if (isSensitive) {
    score += W.sensitivePenalty
  } else if (isAttractive) {
    score += W.attractiveCategory
  } else {
    score += BUCKET_NUDGE[merchant.category]
  }

  // 5. Producer quality.
  if (merchant.isProducer || merchant.category === 'producer') {
    score += W.producer
    if (PREMIUM_PRODUCER_TERMS.some((t) => haystack.includes(t))) score += W.premiumProducer
  }

  // Rating (0–5), down-weighted when too few reviews to trust.
  if (typeof merchant.rating === 'number' && Number.isFinite(merchant.rating)) {
    const confidence = (merchant.reviewCount ?? 0) >= W.lowConfidenceReviews ? 1 : 0.5
    score += clamp((merchant.rating - W.ratingPivot) * W.ratingScale, -W.ratingClamp, W.ratingClamp) * confidence
  }

  // Open now — small bonus; never penalizes a closed/unknown merchant.
  if (merchant.isOpenNow) score += W.openNow

  return score
}

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

  // « À découvrir » : the next best editorially, excluding the two sections above.
  const used = new Set<string>([...recommendedToday, ...nearbyProducers].map((m) => m.id))
  const toDiscover = [...merchants]
    .sort(byEditorial)
    .filter((m) => !used.has(m.id))
    .slice(0, limitD)

  return { recommendedToday, nearbyProducers, toDiscover }
}
