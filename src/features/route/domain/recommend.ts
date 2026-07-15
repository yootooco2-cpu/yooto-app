/**
 * Orchestrateur pur du pipeline de recommandation :
 * gates d'éligibilité → score versionné → départage stable → sélection.
 *
 * Aucune UI, aucun réseau, aucun LLM. Le temps est injecté. Une absence de
 * résultat produit un état métier honnête et audité — jamais une
 * recommandation forcée.
 */

import type { EligibilityContext, ExclusionReason } from './eligibility';
import { evaluateEligibility, isAccessibilityRequired } from './eligibility';
import { buildRecommendationReason, explainEmptyResult } from './reasons';
import type { RankedCandidate } from './scoring';
import { rankCandidates, SCORE_VERSION, scoreCandidate } from './scoring';
import type {
  MerchantCandidate,
  Recommendation,
  RecommendationNote,
  RouteEvaluation,
} from './types';

export interface RecommendationInputItem {
  candidate: MerchantCandidate;
  evaluation: RouteEvaluation;
}

export interface RecommendationAudit {
  scoreVersion: number;
  evaluatedCount: number;
  eligibleCount: number;
  /** Compte de CHAQUE motif d'exclusion rencontré — auditable. */
  exclusionCounts: Partial<Record<ExclusionReason, number>>;
}

export type RecommendationOutcome =
  | {
      kind: 'recommendation';
      recommendation: Recommendation;
      /** Alternatives sur demande (jamais poussées), bornées par la config. */
      alternatives: readonly Recommendation[];
      audit: RecommendationAudit;
    }
  | {
      kind: 'none';
      /** Explication honnête et déterministe de l'absence de résultat. */
      explanation: string;
      audit: RecommendationAudit;
    };

function toRecommendation(
  ranked: RankedCandidate,
  notes: readonly RecommendationNote[],
  ctx: EligibilityContext,
): Recommendation {
  return {
    merchantId: ranked.candidate.merchantId,
    scoreVersion: ranked.result.version,
    score: ranked.result.score,
    factors: ranked.result.factors,
    notes,
    reason: buildRecommendationReason({
      opening: ranked.candidate.opening,
      detourSeconds: ranked.evaluation.detourSeconds,
      accessibility: ranked.candidate.accessibility,
      accessibilityRequired: isAccessibilityRequired(ctx.mode, ctx.mission),
      notes,
    }),
    routeVersion: ctx.routeVersion,
    detourSeconds: ranked.evaluation.detourSeconds,
    createdAtMs: ctx.nowMs,
    expiresAtMs: ctx.nowMs + ctx.config.recommendationTtlMs,
  };
}

export function recommendOnRoute(
  items: readonly RecommendationInputItem[],
  ctx: EligibilityContext,
): RecommendationOutcome {
  const exclusionCounts: Partial<Record<ExclusionReason, number>> = {};
  const eligible: { ranked: RankedCandidate; notes: readonly RecommendationNote[] }[] = [];

  for (const item of items) {
    const verdict = evaluateEligibility(item.candidate, item.evaluation, ctx);
    if (!verdict.eligible) {
      for (const reason of verdict.exclusions) {
        exclusionCounts[reason] = (exclusionCounts[reason] ?? 0) + 1;
      }
      continue;
    }
    eligible.push({
      ranked: {
        candidate: item.candidate,
        evaluation: item.evaluation,
        result: scoreCandidate(item.candidate, item.evaluation, {
          mission: ctx.mission,
          maxDetourSeconds: ctx.maxDetourSeconds,
          config: ctx.config,
        }),
      },
      notes: verdict.notes,
    });
  }

  const audit: RecommendationAudit = {
    scoreVersion: SCORE_VERSION,
    evaluatedCount: items.length,
    eligibleCount: eligible.length,
    exclusionCounts,
  };

  if (eligible.length === 0) {
    return {
      kind: 'none',
      explanation: explainEmptyResult(items.length, exclusionCounts),
      audit,
    };
  }

  const notesByMerchantId = new Map(
    eligible.map((entry) => [entry.ranked.candidate.merchantId, entry.notes]),
  );
  const sorted = rankCandidates(eligible.map((entry) => entry.ranked));
  const [best, ...rest] = sorted;

  return {
    kind: 'recommendation',
    recommendation: toRecommendation(best, notesByMerchantId.get(best.candidate.merchantId) ?? [], ctx),
    alternatives: rest
      .slice(0, Math.max(0, ctx.config.maxAlternatives))
      .map((ranked) =>
        toRecommendation(ranked, notesByMerchantId.get(ranked.candidate.merchantId) ?? [], ctx),
      ),
    audit,
  };
}

export type RecommendationInvalidity = 'expired' | 'route_changed';

export interface RecommendationUsability {
  usable: boolean;
  invalidity?: RecommendationInvalidity;
}

/**
 * Une recommandation expirée ou liée à une ancienne version de route est
 * rejetée — elle ne doit jamais être annoncée ni acceptée.
 */
export function checkRecommendationUsability(
  recommendation: Recommendation,
  routeVersion: number,
  nowMs: number,
): RecommendationUsability {
  if (recommendation.routeVersion !== routeVersion) {
    return { usable: false, invalidity: 'route_changed' };
  }
  if (nowMs >= recommendation.expiresAtMs) {
    return { usable: false, invalidity: 'expired' };
  }
  return { usable: true };
}
