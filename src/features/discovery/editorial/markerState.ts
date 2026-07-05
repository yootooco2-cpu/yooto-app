import type { MarkerImportance } from '@/design/tokens/mapMarkers';
import { getMerchantCoverPhoto } from '@/features/merchants/photos';
import type { Merchant } from '@/features/merchants/types';

import { resolveTier } from './categoryTiers';
import { getMerchantEditorialScore } from './editorialScore';

export type { MarkerImportance };

/**
 * Seuils de score éditorial qui BANDENT l'importance d'un marqueur. Calibrés sur le corpus réel
 * (676 commerces, audit du 2026-07) pour que la hiérarchie soit lisible et l'OR RARE :
 *   or ≈ 2.8 % · recommandé ≈ 15 % · standard ≈ 82 %.
 *
 * L'OR n'est PAS une récompense algorithmique : c'est la **plus haute confiance éditoriale** de
 * YOOTOO (« s'il fallait vous faire découvrir UN seul lieu, ce serait probablement celui-ci »). Sa
 * rareté fait sa valeur. → docs/map/DESIGN-SYSTEM.md §5 · ADR-011.
 *
 * ⚠️ Seuils calibrés sur Montpellier : à recalibrer si le corpus/la ville change (source unique ici).
 */
export const GOLD_SCORE = 146;
export const RECOMMENDED_SCORE = 120;

/**
 * markerState — décide l'IMPORTANCE éditoriale d'un commerce sur la carte. PUR & testable
 * (aucune dépendance Mapbox/DOM). C'est le Discovery Engine qui parle : le STYLE, lui, vit dans le
 * Map Engine (`markerVisualModel`). Fondé sur la SOURCE UNIQUE de tri (ADR-003) :
 * `getMerchantEditorialScore` = la confiance que YOOTOO accorde au lieu.
 *
 *  1. Hors mission / mission faible (`veryLow` | `low`) → jamais mis en avant → Standard.
 *  2. Pas de VRAIE photo → jamais mis en avant (la photo est l'émotion) → Standard.
 *  3. Exceptionnel (OR) : score ≥ `GOLD_SCORE` → distinction éditoriale RARE.
 *  4. Recommandé        : score ≥ `RECOMMENDED_SCORE` → minorité mise en avant.
 *  5. Standard          : sinon (le fond calme qui laisse les héros ressortir).
 *
 * L'état « sélectionné » n'est PAS ici : c'est un focus transitoire appliqué au rendu.
 * (Phase 6 — vie contextuelle : un contexte temps/saison pourra promouvoir l'importance
 * SANS changer le style — marché du samedi matin, café du matin, producteur en saison.)
 */
export function markerState(merchant: Merchant): MarkerImportance {
  const tier = resolveTier(
    merchant.rawCategory,
    merchant.rawMerchantType,
    merchant.name,
    merchant.description,
  );
  // Hors mission ou mission faible : cohérent avec le tri éditorial (ADR-003) — jamais promu.
  if (tier === 'veryLow' || tier === 'low') return 'standard';
  // La photo est le héros : sans vraie photo, pas de mise en avant.
  if (getMerchantCoverPhoto(merchant) === null) return 'standard';

  const score = getMerchantEditorialScore(merchant);
  if (score >= GOLD_SCORE) return 'exceptional';
  if (score >= RECOMMENDED_SCORE) return 'recommended';
  return 'standard';
}
