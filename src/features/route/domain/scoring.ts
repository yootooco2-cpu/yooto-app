/**
 * RankingEngine v1 — score versionné, normalisé et explicable.
 *
 * Le score n'intervient QU'APRÈS les exclusions bloquantes (eligibility) :
 * la sécurité et l'accessibilité ne sont jamais des facteurs de score.
 * Chaque facteur est conservé pour audit ; les poids sont une hypothèse de
 * départ à calibrer sur les données pilotes.
 */

import type { RouteEngineConfig } from '../config';
import { missionCategoryFit } from './eligibility';
import type {
  MerchantCandidate,
  Mission,
  RouteEvaluation,
  ScoreFactors,
} from './types';

export const SCORE_VERSION = 1;

export const SCORE_WEIGHTS_V1: Readonly<ScoreFactors> = {
  mission: 0.35,
  detour: 0.25,
  openingConfidence: 0.15,
  quality: 0.15,
  localPreference: 0.1,
};

export interface ScoreResult {
  version: typeof SCORE_VERSION;
  /** Score agrégé [0,1] — interne, jamais affiché brut. */
  score: number;
  factors: ScoreFactors;
  weights: Readonly<ScoreFactors>;
}

export interface ScoringContext {
  mission: Mission;
  maxDetourSeconds: number;
  config: RouteEngineConfig;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function computeScoreFactors(
  candidate: MerchantCandidate,
  evaluation: RouteEvaluation,
  ctx: ScoringContext,
): ScoreFactors {
  const fit = missionCategoryFit(ctx.mission, candidate);
  const mission =
    fit === 'primary' ? 1 : fit === 'compatible' ? clamp01(ctx.config.compatibleCategoryFit) : 0;

  // Détour : 1 pour un détour nul, 0 à la tolérance maximale.
  const detour =
    ctx.maxDetourSeconds <= 0
      ? 0
      : clamp01(1 - evaluation.detourSeconds / ctx.maxDetourSeconds);

  // Confiance d'ouverture : seule une ouverture confirmée en apporte.
  // « unknown » vaut 0 ici mais n'est jamais converti en fermeture — le
  // gate d'éligibilité a déjà tranché ce qui était bloquant.
  const openingConfidence =
    candidate.opening.status === 'open' ? clamp01(candidate.opening.confidence) : 0;

  // Le silence ne punit jamais : une donnée absente vaut la valeur neutre.
  const quality =
    candidate.qualityScore === undefined
      ? clamp01(ctx.config.neutralQuality)
      : clamp01(candidate.qualityScore);
  const localPreference =
    candidate.localScore === undefined
      ? clamp01(ctx.config.neutralLocalPreference)
      : clamp01(candidate.localScore);

  return { mission, detour, openingConfidence, quality, localPreference };
}

export function scoreCandidate(
  candidate: MerchantCandidate,
  evaluation: RouteEvaluation,
  ctx: ScoringContext,
): ScoreResult {
  const factors = computeScoreFactors(candidate, evaluation, ctx);
  const score =
    SCORE_WEIGHTS_V1.mission * factors.mission +
    SCORE_WEIGHTS_V1.detour * factors.detour +
    SCORE_WEIGHTS_V1.openingConfidence * factors.openingConfidence +
    SCORE_WEIGHTS_V1.quality * factors.quality +
    SCORE_WEIGHTS_V1.localPreference * factors.localPreference;

  return { version: SCORE_VERSION, score: clamp01(score), factors, weights: SCORE_WEIGHTS_V1 };
}

export interface RankedCandidate {
  candidate: MerchantCandidate;
  evaluation: RouteEvaluation;
  result: ScoreResult;
}

/**
 * Règle de départage stable et testée, appliquée dans l'ordre :
 * 1. score décroissant ;
 * 2. détour croissant (le plus court gagne) ;
 * 3. confiance d'ouverture décroissante ;
 * 4. merchantId croissant (ordre lexicographique — arbitre final total).
 */
export function compareRanked(a: RankedCandidate, b: RankedCandidate): number {
  if (a.result.score !== b.result.score) return b.result.score - a.result.score;
  if (a.evaluation.detourSeconds !== b.evaluation.detourSeconds) {
    return a.evaluation.detourSeconds - b.evaluation.detourSeconds;
  }
  if (a.result.factors.openingConfidence !== b.result.factors.openingConfidence) {
    return b.result.factors.openingConfidence - a.result.factors.openingConfidence;
  }
  return a.candidate.merchantId < b.candidate.merchantId
    ? -1
    : a.candidate.merchantId > b.candidate.merchantId
      ? 1
      : 0;
}

export function rankCandidates(items: readonly RankedCandidate[]): RankedCandidate[] {
  return [...items].sort(compareRanked);
}
