/**
 * Eligibility gates déterministes — les exclusions précèdent le score.
 *
 * Chaque exclusion porte un motif auditable. Règles non négociables :
 * - « unknown » n'est jamais « closed » ni « not accessible » : le tri-état
 *   est préservé de bout en bout ;
 * - une absence de donnée n'exclut que lorsque la contrainte est bloquante
 *   (mission essentielle, accessibilité obligatoire) ;
 * - la sécurité et l'accessibilité sont des gates, jamais des bonus de score.
 */

import type { RouteEngineConfig } from '../config';
import type {
  MerchantCandidate,
  Mission,
  RecommendationNote,
  RouteEvaluation,
  TransportMode,
} from './types';

export type ExclusionReason =
  | 'mission_mismatch'
  | 'detour_exceeded'
  | 'closed_at_eta'
  | 'opening_unknown_essential'
  | 'opening_confidence_too_low'
  | 'accessibility_blocked'
  | 'accessibility_unknown_required'
  | 'already_refused'
  | 'already_announced'
  | 'evaluation_stale'
  | 'route_version_mismatch'
  | 'quality_below_minimum';

export interface EligibilityContext {
  mission: Mission;
  mode: TransportMode;
  routeVersion: number;
  maxDetourSeconds: number;
  refusedMerchantIds: readonly string[];
  announcedMerchantIds: readonly string[];
  /** Temps injecté — jamais Date.now() dans le domaine. */
  nowMs: number;
  config: RouteEngineConfig;
}

export interface EligibilityVerdict {
  eligible: boolean;
  /** Tous les motifs d'exclusion constatés (audit complet, pas seulement le premier). */
  exclusions: readonly ExclusionReason[];
  /** Mentions honnêtes à porter si le candidat reste éligible. */
  notes: readonly RecommendationNote[];
}

export type MissionCategoryFit = 'primary' | 'compatible' | 'none';

/**
 * L'accessibilité devient une contrainte bloquante si le mode est le
 * fauteuil roulant OU si la mission l'exige. Le fauteuil n'est jamais
 * traité comme la marche.
 */
export function isAccessibilityRequired(mode: TransportMode, mission: Mission): boolean {
  return mode === 'wheelchair' || mission.requiresAccessibility;
}

export function missionCategoryFit(
  mission: Mission,
  candidate: MerchantCandidate,
): MissionCategoryFit {
  const categories = new Set(candidate.categoryIds);
  if (mission.primaryCategoryIds.some((id) => categories.has(id))) return 'primary';
  if (mission.compatibleCategoryIds.some((id) => categories.has(id))) return 'compatible';
  return 'none';
}

export function evaluateEligibility(
  candidate: MerchantCandidate,
  evaluation: RouteEvaluation,
  ctx: EligibilityContext,
): EligibilityVerdict {
  const exclusions: ExclusionReason[] = [];
  const notes: RecommendationNote[] = [];
  const { mission, config } = ctx;

  // 1. Mission : identifiants de catégories opaques, jamais des libellés.
  if (missionCategoryFit(mission, candidate) === 'none') {
    exclusions.push('mission_mismatch');
  }

  // 2. Validité de l'évaluation de détour : version de route et fraîcheur.
  if (evaluation.routeVersion !== ctx.routeVersion) {
    exclusions.push('route_version_mismatch');
  }
  if (ctx.nowMs - evaluation.computedAtMs > config.evaluationTtlMs) {
    exclusions.push('evaluation_stale');
  }

  // 3. Détour : le détour vient du fournisseur de route, jamais estimé ici.
  if (evaluation.detourSeconds > ctx.maxDetourSeconds) {
    exclusions.push('detour_exceeded');
  }

  // 4. Ouverture à l'ETA — tri-état préservé.
  switch (candidate.opening.status) {
    case 'closed':
      exclusions.push('closed_at_eta');
      break;
    case 'unknown':
      if (mission.essential) {
        exclusions.push('opening_unknown_essential');
      } else {
        notes.push('opening_to_confirm');
      }
      break;
    case 'open':
      if (mission.essential && candidate.opening.confidence < config.minOpeningConfidenceEssential) {
        exclusions.push('opening_confidence_too_low');
      } else if (
        !mission.essential &&
        candidate.opening.confidence < config.openingConfidenceNoteThreshold
      ) {
        notes.push('opening_to_confirm');
      }
      break;
  }

  // 5. Accessibilité — gate bloquant, jamais un bonus.
  //    Contrainte obligatoire : « unknown » ne vaut JAMAIS accessible.
  if (isAccessibilityRequired(ctx.mode, mission)) {
    if (candidate.accessibility === 'no') {
      exclusions.push('accessibility_blocked');
    } else if (candidate.accessibility === 'unknown') {
      exclusions.push('accessibility_unknown_required');
    }
  } else if (candidate.accessibility === 'unknown') {
    notes.push('accessibility_to_confirm');
  }

  // 6. Mémoire de session : jamais reproposer un refusé ou un déjà annoncé.
  if (ctx.refusedMerchantIds.includes(candidate.merchantId)) {
    exclusions.push('already_refused');
  }
  if (ctx.announcedMerchantIds.includes(candidate.merchantId)) {
    exclusions.push('already_announced');
  }

  // 7. Qualité minimale : appliquée seulement si la qualité est CONNUE.
  if (
    config.minKnownQualityScore !== null &&
    candidate.qualityScore !== undefined &&
    candidate.qualityScore < config.minKnownQualityScore
  ) {
    exclusions.push('quality_below_minimum');
  }

  return { eligible: exclusions.length === 0, exclusions, notes };
}
