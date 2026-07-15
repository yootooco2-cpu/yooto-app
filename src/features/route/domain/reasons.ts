/**
 * Raisons déterministes — templates sans LLM.
 *
 * Chaque phrase est construite UNIQUEMENT à partir de faits structurés
 * (statut d'ouverture, détour fourni par le fournisseur de route, tri-état
 * d'accessibilité). Vocabulaire prudent : une accessibilité vérifiée est
 * « indiquée », jamais « garantie » ; une donnée absente est « à
 * confirmer », jamais inventée. Ton vouvoyé, conforme à DESIGN.md.
 */

import type { ExclusionReason } from './eligibility';
import type {
  OpeningAtEta,
  RecommendationNote,
  RoutingValidationStatus,
  TriState,
} from './types';

/**
 * Libellé métier MAXIMAL pour une route fauteuil (décision GATE 2B).
 * Interdits absolus : « garanti accessible », « totalement accessible » ou
 * toute garantie implicite équivalente.
 */
export const WHEELCHAIR_ROUTE_MAX_LABEL =
  'Itinéraire adapté fauteuil d’après les données disponibles';

/**
 * Libellé d'une route fauteuil selon le statut de validation de la
 * configuration : une config non validée terrain reste signalée.
 */
export function buildWheelchairRouteLabel(status: RoutingValidationStatus): string {
  if (status === 'pilot_validated') return WHEELCHAIR_ROUTE_MAX_LABEL;
  return `${WHEELCHAIR_ROUTE_MAX_LABEL} · Réglages d’accessibilité non validés terrain`;
}

export function formatDetourMinutes(detourSeconds: number): string {
  if (detourSeconds < 60) return 'moins de 1 min';
  return `${Math.round(detourSeconds / 60)} min`;
}

export interface ReasonInput {
  opening: OpeningAtEta;
  detourSeconds: number;
  accessibility: TriState;
  accessibilityRequired: boolean;
  notes: readonly RecommendationNote[];
}

/**
 * Raison courte d'une recommandation. Exemples :
 * - « Ouvert à votre passage, détour 2 min »
 * - « Horaires à confirmer, détour 3 min · Accessibilité à confirmer »
 * - « Ouvert à votre passage, détour 1 min · Accès fauteuil indiqué »
 */
export function buildRecommendationReason(input: ReasonInput): string {
  const detour = formatDetourMinutes(input.detourSeconds);

  const openingPart =
    input.opening.status === 'open' && !input.notes.includes('opening_to_confirm')
      ? `Ouvert à votre passage, détour ${detour}`
      : `Horaires à confirmer, détour ${detour}`;

  const extras: string[] = [];
  if (input.accessibilityRequired && input.accessibility === 'yes') {
    // Une preuve d'accessibilité reste « indiquée », jamais garantie.
    extras.push('Accès fauteuil indiqué');
  }
  if (input.notes.includes('accessibility_to_confirm')) {
    extras.push('Accessibilité à confirmer');
  }

  return [openingPart, ...extras].join(' · ');
}

/** Libellés d'exclusion pour l'état vide honnête — ordre stable pour le départage. */
const EXCLUSION_LABELS: Readonly<Record<ExclusionReason, string>> = {
  mission_mismatch: 'aucun commerce ne correspond à votre mission',
  detour_exceeded: 'les détours dépassent votre tolérance',
  closed_at_eta: 'les commerces seraient fermés à votre passage',
  opening_unknown_essential: 'les horaires ne sont pas confirmés',
  opening_confidence_too_low: 'les horaires ne sont pas assez fiables',
  accessibility_blocked: 'les lieux ne sont pas accessibles',
  accessibility_unknown_required: "l'accessibilité n'est pas vérifiée",
  already_refused: 'les commerces restants ont déjà été refusés',
  already_announced: 'les commerces restants ont déjà été proposés',
  evaluation_stale: 'les calculs de détour ont expiré',
  route_version_mismatch: 'votre itinéraire a changé',
  quality_below_minimum: 'la fiabilité des fiches est insuffisante',
};

const EXCLUSION_ORDER: readonly ExclusionReason[] = [
  'mission_mismatch',
  'detour_exceeded',
  'closed_at_eta',
  'opening_unknown_essential',
  'opening_confidence_too_low',
  'accessibility_blocked',
  'accessibility_unknown_required',
  'already_refused',
  'already_announced',
  'evaluation_stale',
  'route_version_mismatch',
  'quality_below_minimum',
];

/**
 * État vide honnête : on explique sobrement pourquoi rien n'est proposé,
 * à partir du motif d'exclusion dominant. Jamais de recommandation forcée.
 */
export function explainEmptyResult(
  evaluatedCount: number,
  exclusionCounts: Partial<Record<ExclusionReason, number>>,
): string {
  if (evaluatedCount === 0) {
    return 'Aucun commerce compatible sur ce trajet.';
  }
  let dominant: ExclusionReason | null = null;
  let dominantCount = 0;
  // Parcours dans un ordre fixe : le départage des ex æquo est stable.
  for (const reason of EXCLUSION_ORDER) {
    const count = exclusionCounts[reason] ?? 0;
    if (count > dominantCount) {
      dominant = reason;
      dominantCount = count;
    }
  }
  if (dominant === null) {
    return 'Aucune étape fiable sur ce trajet.';
  }
  return `Aucune étape proposée : ${EXCLUSION_LABELS[dominant]}.`;
}
