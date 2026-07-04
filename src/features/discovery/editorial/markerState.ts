import type { MarkerImportance } from '@/design/tokens/mapMarkers';
import { getMerchantCoverPhoto } from '@/features/merchants/photos';
import type { Merchant } from '@/features/merchants/types';

import { resolveTier } from './categoryTiers';

export type { MarkerImportance };

/**
 * markerState — décide l'IMPORTANCE éditoriale d'un commerce sur la carte. PUR & testable
 * (aucune dépendance Mapbox/DOM). C'est le Discovery Engine qui parle : le STYLE, lui, vit
 * dans le Map Engine (`markerVisualModel`). Cohérent avec le tri éditorial unique (ADR-003) :
 * mission (`resolveTier`) → vraie photo → note.
 *
 *  1. Hors mission / mission faible (`veryLow` | `low`) → jamais mis en avant → Standard.
 *  2. Pas de VRAIE photo → jamais mis en avant (la photo est l'émotion) → Standard.
 *  3. Exceptionnel : mission `max` + note haute (≥ 4.5) → « à ne pas manquer » (rare).
 *  4. Recommandé   : mission `max`, OU producteur local noté ≥ 4.0 (mission `medium`).
 *  5. Standard     : sinon.
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

  const rating = merchant.rating ?? 0;
  const isProducer = merchant.isProducer || merchant.category === 'producer';

  if (tier === 'max' && rating >= 4.5) return 'exceptional';
  if (tier === 'max' || (isProducer && rating >= 4.0)) return 'recommended';
  return 'standard';
}
