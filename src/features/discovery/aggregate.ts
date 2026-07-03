import type { SignalContribution } from './types';

// aggregate — AGRÉGATEUR v2 (Sprint 1 « socle invisible »).
//
// Combine deux familles de signaux :
//   • ADDITIFS      → moyenne pondérée = pertinence contextuelle (distance, note, ouvert…) ;
//   • MULTIPLICATIFS → produit = gate éditorial (prior de catégorie, qualité) — prévu Sprint 2.
//
//   rankingScore = gate × ( FLOOR + (1 − FLOOR) · contextualRelevance )
//
// INVARIANT DE NON-RÉGRESSION (Sprint 1) : tant qu'AUCUN signal `multiplicative` n'existe,
// `gate = 1`, et `x ↦ FLOOR + (1−FLOOR)·x` est strictement croissante → l'ORDRE produit par
// `aggregate` est IDENTIQUE à celui de la moyenne pondérée actuelle. Prouvé par les tests.
//
// Fonction PURE, sans dépendance runtime (le type est effacé à la compilation) → testable
// sans charger le registre de signaux (donc sans dépendances React Native).

/** Plancher contextuel : garantit que le gate éditorial domine l'ordre inter-tiers,
 *  tandis que la pertinence contextuelle ordonne à l'intérieur d'un tier. */
export const FLOOR = 0.15;

const modeOf = (c: SignalContribution): 'additive' | 'multiplicative' => c.mode ?? 'additive';

/** Moyenne pondérée des signaux additifs. `0` si aucun (comme l'agrégateur actuel). */
export function contextualRelevance(contributions: SignalContribution[]): number {
  let totalWeight = 0;
  let weighted = 0;
  for (const c of contributions) {
    if (modeOf(c) !== 'additive') continue;
    totalWeight += c.weight;
    weighted += c.weight * c.value;
  }
  return totalWeight > 0 ? weighted / totalWeight : 0;
}

/** Produit des signaux multiplicatifs. `1` (neutre) si aucun → comportement actuel. */
export function editorialGate(contributions: SignalContribution[]): number {
  let gate = 1;
  for (const c of contributions) {
    if (modeOf(c) === 'multiplicative') gate *= c.value;
  }
  return gate;
}

/**
 * Score final [0, ~1] à partir des contributions.
 * Sprint 1 : appelé avec des contributions purement additives → `gate = 1` → ordre inchangé.
 */
export function aggregate(contributions: SignalContribution[]): number {
  const gate = editorialGate(contributions);
  const contextual = contextualRelevance(contributions);
  return gate * (FLOOR + (1 - FLOOR) * contextual);
}
