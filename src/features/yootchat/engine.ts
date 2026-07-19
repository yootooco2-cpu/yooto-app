import type { InterfaceAction, YootChatAction } from './actions';
import type {
  ActionPlan,
  FinalResponse,
  MerchantCandidate,
  MerchantRecommendation,
  RequestFilters,
  ValidationResult,
  YootChatRequest,
} from './contracts';
import type { MerchantClaim } from './evidence';
import { createSafeFallback, safeResultOrFallback } from './fallbacks';
import type { YootChatTopic } from './topics';
import { validateActionPlan, validateCandidate, validateFinalResponse, validateRequest } from './validators';

export type CandidateQuarantineReason =
  | 'INVALID_CANDIDATE'
  | 'DUPLICATE_ID'
  | 'CITY_MISMATCH'
  | 'CATEGORY_MISMATCH'
  | 'OPEN_NOW_MISMATCH'
  | 'ACCESSIBILITY_REQUIRED'
  | 'DISTANCE_UNKNOWN'
  | 'DISTANCE_TOO_FAR';

export interface QuarantinedCandidate {
  readonly id: string | null;
  readonly reason: CandidateQuarantineReason;
}

export interface DeterministicEngineInput {
  readonly request: unknown;
  readonly candidates: readonly unknown[];
}

export interface DeterministicEngineSuccess {
  readonly ok: true;
  readonly request: YootChatRequest;
  readonly topic: YootChatTopic;
  readonly plan: ActionPlan;
  readonly consideredCandidates: readonly MerchantCandidate[];
  readonly quarantinedCandidates: readonly QuarantinedCandidate[];
  readonly response: FinalResponse;
}

export interface DeterministicEngineFailure {
  readonly ok: false;
  readonly errors: readonly string[];
  readonly response: FinalResponse;
}

export type DeterministicEngineResult = DeterministicEngineSuccess | DeterministicEngineFailure;

const sourceFieldFor: Record<MerchantClaim['field'], string> = {
  name: 'facts.name',
  category: 'facts.category',
  city: 'facts.city',
  openNow: 'facts.openNow',
  rating: 'facts.rating',
  accessibility: 'facts.accessibility',
  service: 'facts.services',
  equipment: 'facts.equipment',
  officialCommitment: 'facts.officialCommitments',
  distanceKm: 'distanceKm',
};

const asCandidateId = (value: unknown): string | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value) || !('id' in value)) return null;
  const id = (value as { readonly id?: unknown }).id;
  return typeof id === 'string' && id.length > 0 ? id : null;
};

const normalize = (value: string) => value.trim().toLocaleLowerCase('fr-FR');

const unique = <T>(values: readonly T[]) => [...new Set(values)];

const verifiedClaim = (
  field: MerchantClaim['field'],
  value: MerchantClaim['value'],
  origin: MerchantClaim['evidence']['origin'] = 'YOOTOO_DATABASE',
): MerchantClaim => ({
  field,
  value,
  status: 'VERIFIED',
  evidence: {
    level: 'VERIFIED',
    origin,
    sourceField: sourceFieldFor[field],
  },
});

const unknownClaim = (field: MerchantClaim['field'], origin: MerchantClaim['evidence']['origin'] = 'YOOTOO_DATABASE'): MerchantClaim => ({
  field,
  value: null,
  status: 'UNKNOWN',
  evidence: {
    level: 'UNKNOWN',
    origin,
    sourceField: sourceFieldFor[field],
  },
});

export function inferDeterministicTopic(request: YootChatRequest): YootChatTopic {
  const message = normalize(request.message);
  if (/\b(paie|payer|achat|achete|acheter|reserve|reserver|reservation|appelle|appeler|message|publie|publier)\b/.test(message)) {
    return 'OUT_OF_SCOPE';
  }
  if (request.filters?.accessibilityRequired || /\b(pmr|accessible|accessibilite|fauteuil)\b/.test(message)) return 'ACCESSIBILITY';
  if (/\b(compare|comparer|versus|meilleur|mieux)\b/.test(message)) return 'COMPARE_OPTIONS';
  if (/\b(trajet|itineraire|route|distance|aller)\b/.test(message)) return 'ROUTE_AND_MOBILITY';
  if (/\b(detail|details|fiche|adresse)\b/.test(message)) return 'MERCHANT_DETAILS';
  return 'DISCOVER_LOCAL';
}

function buildPlan(request: YootChatRequest, topic: YootChatTopic, candidateIds: readonly string[]): ActionPlan {
  const steps: YootChatAction[] = [];
  if (topic === 'OUT_OF_SCOPE') return { topic, steps: [{ action: 'RETURN_NO_RESULT', params: { reason: 'INSUFFICIENT_EVIDENCE' } }] };

  steps.push({
    action: 'SEARCH_ACTIVE_MERCHANTS',
    params: {
      query: request.message,
      ...(request.city ? { city: request.city } : {}),
      ...(request.radiusKm !== undefined ? { radiusKm: request.radiusKm } : {}),
      ...(request.filters?.categoryIds ? { categoryIds: request.filters.categoryIds } : {}),
      ...(request.filters?.openNow !== undefined ? { openNow: request.filters.openNow } : {}),
      ...(request.filters?.accessibilityRequired !== undefined ? { accessibilityRequired: request.filters.accessibilityRequired } : {}),
    },
  });

  if (candidateIds.length > 0) {
    steps.push({
      action: 'FILTER_MERCHANTS',
      params: {
        candidateIds,
        ...(request.filters?.categoryIds ? { categoryIds: request.filters.categoryIds } : {}),
        ...(request.filters?.openNow !== undefined ? { openNow: request.filters.openNow } : {}),
        ...(request.filters?.accessibilityRequired !== undefined ? { accessibilityRequired: request.filters.accessibilityRequired } : {}),
        ...(request.filters?.maxDistanceKm !== undefined ? { maxDistanceKm: request.filters.maxDistanceKm } : {}),
      },
    });
    steps.push({ action: 'RANK_MERCHANTS', params: { candidateIds, strategy: 'DISTANCE' } });
  } else {
    steps.push({ action: 'RETURN_NO_RESULT', params: { reason: 'NO_ACTIVE_CANDIDATE' } });
  }
  return validateActionPlan({ topic, steps }).ok ? { topic, steps } : { topic: 'CLARIFICATION', steps: [] };
}

function splitValidCandidates(candidates: readonly unknown[]) {
  const valid: MerchantCandidate[] = [];
  const quarantined: QuarantinedCandidate[] = [];

  for (const candidate of candidates) {
    const result = validateCandidate(candidate);
    if (result.ok) {
      valid.push(result.value);
    } else {
      quarantined.push({ id: asCandidateId(candidate), reason: 'INVALID_CANDIDATE' });
    }
  }

  const counts = valid.reduce<Record<string, number>>((acc, candidate) => {
    acc[candidate.id] = (acc[candidate.id] ?? 0) + 1;
    return acc;
  }, {});
  const duplicateIds = new Set(Object.entries(counts).filter(([, count]) => count > 1).map(([id]) => id));

  if (duplicateIds.size === 0) return { valid, quarantined };

  return {
    valid: valid.filter((candidate) => !duplicateIds.has(candidate.id)),
    quarantined: [
      ...quarantined,
      ...valid.filter((candidate) => duplicateIds.has(candidate.id)).map((candidate) => ({ id: candidate.id, reason: 'DUPLICATE_ID' as const })),
    ],
  };
}

function filterCandidate(candidate: MerchantCandidate, request: YootChatRequest): CandidateQuarantineReason | null {
  const filters: RequestFilters = request.filters ?? {};
  const maxDistanceKm = filters.maxDistanceKm ?? request.radiusKm;

  if (request.city && normalize(candidate.facts.city ?? '') !== normalize(request.city)) return 'CITY_MISMATCH';
  if (filters.categoryIds && !filters.categoryIds.includes(candidate.facts.category)) return 'CATEGORY_MISMATCH';
  if (filters.openNow !== undefined && candidate.facts.openNow !== filters.openNow) return 'OPEN_NOW_MISMATCH';
  if (filters.accessibilityRequired && candidate.facts.accessibility !== 'VERIFIED_ACCESSIBLE') return 'ACCESSIBILITY_REQUIRED';
  if (maxDistanceKm !== undefined) {
    if (candidate.distanceKm === null) return 'DISTANCE_UNKNOWN';
    if (candidate.distanceKm > maxDistanceKm) return 'DISTANCE_TOO_FAR';
  }
  return null;
}

function rankCandidates(candidates: readonly MerchantCandidate[]) {
  return [...candidates].sort((left, right) => {
    if ((left.distanceKm === null) !== (right.distanceKm === null)) return left.distanceKm === null ? 1 : -1;
    if (left.distanceKm !== null && right.distanceKm !== null && left.distanceKm !== right.distanceKm) return left.distanceKm - right.distanceKm;
    if ((left.facts.rating === null) !== (right.facts.rating === null)) return left.facts.rating === null ? 1 : -1;
    if (left.facts.rating !== null && right.facts.rating !== null && left.facts.rating !== right.facts.rating) return right.facts.rating - left.facts.rating;
    return left.id.localeCompare(right.id);
  });
}

function buildRecommendation(candidate: MerchantCandidate, rank: number, request: YootChatRequest): MerchantRecommendation {
  const reasons: MerchantClaim[] = [
    verifiedClaim('name', candidate.facts.name),
    verifiedClaim('category', candidate.facts.category),
  ];

  if (candidate.distanceKm !== null) reasons.push(verifiedClaim('distanceKm', candidate.distanceKm, 'SERVER_CALCULATION'));
  if (candidate.facts.rating !== null) reasons.push(verifiedClaim('rating', candidate.facts.rating));
  if (candidate.facts.accessibility === 'VERIFIED_ACCESSIBLE' || candidate.facts.accessibility === 'VERIFIED_NOT_ACCESSIBLE') {
    reasons.push(verifiedClaim('accessibility', candidate.facts.accessibility));
  } else if (request.filters?.accessibilityRequired !== true) {
    reasons.push(unknownClaim('accessibility'));
  }
  for (const service of candidate.facts.services) reasons.push(verifiedClaim('service', service));
  for (const equipment of candidate.facts.equipment) reasons.push(verifiedClaim('equipment', equipment));
  for (const commitment of candidate.facts.officialCommitments) reasons.push(verifiedClaim('officialCommitment', commitment, 'OFFICIAL_SOURCE'));

  return {
    merchantId: candidate.id,
    rank,
    distanceKm: candidate.distanceKm,
    reasons,
  };
}

function buildLimitations(recommendations: readonly MerchantRecommendation[], candidates: readonly MerchantCandidate[]) {
  const recommendedIds = new Set(recommendations.map((recommendation) => recommendation.merchantId));
  const selected = candidates.filter((candidate) => recommendedIds.has(candidate.id));
  return unique([
    ...selected.filter((candidate) => candidate.facts.openNow === null).map(() => 'UNKNOWN_HOURS' as const),
    ...selected.filter((candidate) => candidate.facts.accessibility === 'UNKNOWN').map(() => 'UNKNOWN_ACCESSIBILITY' as const),
    ...selected.filter((candidate) => candidate.distanceKm === null).map(() => 'UNKNOWN_DISTANCE' as const),
  ]);
}

function buildInterfaceActions(topic: YootChatTopic, recommendations: readonly MerchantRecommendation[]): readonly InterfaceAction[] {
  return recommendations.map((recommendation): InterfaceAction => {
    if (topic === 'ROUTE_AND_MOBILITY') {
      return { action: 'HAND_OFF_TO_ROUTE', params: { merchantId: recommendation.merchantId, travelMode: 'WALK' } };
    }
    return { action: 'OPEN_MERCHANT_CARD', params: { merchantId: recommendation.merchantId } };
  });
}

function certify(response: FinalResponse, candidates: readonly MerchantCandidate[]): FinalResponse {
  const validation: ValidationResult<FinalResponse> = validateFinalResponse(response, candidates);
  return safeResultOrFallback(validation);
}

export function runDeterministicYootChatEngine(input: DeterministicEngineInput): DeterministicEngineResult {
  const requestResult = validateRequest(input.request);
  if (!requestResult.ok) return { ok: false, errors: requestResult.errors, response: createSafeFallback('INVALID') };

  const request = requestResult.value;
  const topic = inferDeterministicTopic(request);
  if (topic === 'OUT_OF_SCOPE') {
    const response = certify({
      topic,
      message: { template: 'OUT_OF_SCOPE', variables: {} },
      recommendations: [],
      limitations: [],
      interfaceActions: [],
    }, []);
    return { ok: true, request, topic, plan: buildPlan(request, topic, []), consideredCandidates: [], quarantinedCandidates: [], response };
  }

  const { valid, quarantined } = splitValidCandidates(input.candidates);
  const filtered: MerchantCandidate[] = [];
  const filterQuarantine: QuarantinedCandidate[] = [];

  for (const candidate of valid) {
    const reason = filterCandidate(candidate, request);
    if (reason) {
      filterQuarantine.push({ id: candidate.id, reason });
    } else {
      filtered.push(candidate);
    }
  }

  const ranked = rankCandidates(filtered);
  const recommendations = ranked.slice(0, 3).map((candidate, index) => buildRecommendation(candidate, index + 1, request));
  const limitations = recommendations.length === 0 ? ['INSUFFICIENT_EVIDENCE' as const] : buildLimitations(recommendations, ranked);
  const messageVariables = recommendations.length > 0
    ? {
        resultCount: recommendations.length,
        ...(limitations.length > 0 ? { limitationCount: limitations.length } : {}),
      }
    : {
        ...(limitations.length > 0 ? { limitationCount: limitations.length } : {}),
      };
  const response = certify({
    topic: recommendations.length > 0 ? topic : 'NO_RESULT',
    message: {
      template: recommendations.length > 0 ? 'RESULTS_FOUND' : 'NO_RESULT',
      variables: messageVariables,
    },
    recommendations,
    limitations,
    interfaceActions: buildInterfaceActions(topic, recommendations),
  }, ranked);

  return {
    ok: true,
    request,
    topic,
    plan: buildPlan(request, topic, ranked.map((candidate) => candidate.id)),
    consideredCandidates: ranked,
    quarantinedCandidates: [...quarantined, ...filterQuarantine],
    response,
  };
}
