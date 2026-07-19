import { YOOTCHAT_ACTIONS, type YootChatAction } from './actions';
import {
  YOOTCHAT_REQUEST_MESSAGE_MAX_LENGTH,
  type ActionPlan,
  type FinalResponse,
  type MerchantCandidate,
  type MerchantRecommendation,
  type ValidationResult,
  type YootChatRequest,
} from './contracts';
import { CLAIM_FIELDS, EVIDENCE_LEVELS, type MerchantClaim } from './evidence';
import { isYootChatTopic } from './topics';

const ok = <T>(value: T): ValidationResult<T> => ({ ok: true, value });
const fail = <T>(...errors: string[]): ValidationResult<T> => ({
  ok: false,
  code: 'INVALID_REQUEST',
  errors,
});
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []) => {
  const allowed = new Set([...required, ...optional]);
  return required.every((key) => key in value) && Object.keys(value).every((key) => allowed.has(key));
};
const nonEmptyString = (value: unknown, max = 160) =>
  typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= max;
const finiteBetween = (value: unknown, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const uniqueStrings = (value: unknown, options: { min?: number; max?: number } = {}) => {
  if (!Array.isArray(value) || value.length < (options.min ?? 0) || value.length > (options.max ?? 50)) return false;
  if (!value.every((item) => nonEmptyString(item, 120))) return false;
  return new Set(value).size === value.length;
};
const oneOf = <T extends string>(value: unknown, values: readonly T[]): value is T =>
  typeof value === 'string' && values.includes(value as T);
const nullable = <T>(value: unknown, predicate: (input: unknown) => input is T): value is T | null =>
  value === null || predicate(value);
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';

const validateLocation = (value: unknown) =>
  isRecord(value) &&
  exactKeys(value, ['latitude', 'longitude', 'precision']) &&
  finiteBetween(value.latitude, -90, 90) &&
  finiteBetween(value.longitude, -180, 180) &&
  value.precision === 'APPROXIMATE';

const validateCategoryIds = (value: unknown) => uniqueStrings(value, { min: 1, max: 20 });

const validateFilters = (value: unknown) => {
  if (!isRecord(value) || !exactKeys(value, [], ['categoryIds', 'openNow', 'accessibilityRequired', 'maxDistanceKm'])) return false;
  if (Object.keys(value).length === 0) return false;
  if ('categoryIds' in value && !validateCategoryIds(value.categoryIds)) return false;
  if ('openNow' in value && !isBoolean(value.openNow)) return false;
  if ('accessibilityRequired' in value && !isBoolean(value.accessibilityRequired)) return false;
  return !('maxDistanceKm' in value) || finiteBetween(value.maxDistanceKm, 0.1, 100);
};

export function validateRequest(value: unknown): ValidationResult<YootChatRequest> {
  if (!isRecord(value) || !exactKeys(value, ['message', 'language'], ['location', 'city', 'radiusKm', 'filters'])) return fail('request shape');
  if (!nonEmptyString(value.message, YOOTCHAT_REQUEST_MESSAGE_MAX_LENGTH)) return fail('message');
  if (!oneOf(value.language, ['fr', 'en'] as const)) return fail('language');
  if ('location' in value && !validateLocation(value.location)) return fail('location');
  if ('city' in value && !nonEmptyString(value.city, 120)) return fail('city');
  if ('radiusKm' in value && !finiteBetween(value.radiusKm, 0.1, 100)) return fail('radiusKm');
  if ('filters' in value && !validateFilters(value.filters)) return fail('filters');
  return ok(value as unknown as YootChatRequest);
}

export const validateTopic = (value: unknown) =>
  isYootChatTopic(value) ? ok(value) : fail<never>('unknown topic');

const validateMerchantId = (value: unknown) => nonEmptyString(value, 128);
const validateCandidateIds = (value: unknown, min = 1, max = 40) => uniqueStrings(value, { min, max });

const actionParamValidators: Record<(typeof YOOTCHAT_ACTIONS)[number], (value: unknown) => boolean> = {
  SEARCH_ACTIVE_MERCHANTS: (value) => {
    if (!isRecord(value) || !exactKeys(value, ['query'], ['city', 'categoryIds', 'radiusKm', 'openNow', 'accessibilityRequired'])) return false;
    return nonEmptyString(value.query, 500) &&
      (!('city' in value) || nonEmptyString(value.city, 120)) &&
      (!('categoryIds' in value) || validateCategoryIds(value.categoryIds)) &&
      (!('radiusKm' in value) || finiteBetween(value.radiusKm, 0.1, 100)) &&
      (!('openNow' in value) || isBoolean(value.openNow)) &&
      (!('accessibilityRequired' in value) || isBoolean(value.accessibilityRequired));
  },
  FILTER_MERCHANTS: (value) => {
    if (!isRecord(value) || !exactKeys(value, ['candidateIds'], ['categoryIds', 'openNow', 'accessibilityRequired', 'maxDistanceKm'])) return false;
    return validateCandidateIds(value.candidateIds) &&
      (!('categoryIds' in value) || validateCategoryIds(value.categoryIds)) &&
      (!('openNow' in value) || isBoolean(value.openNow)) &&
      (!('accessibilityRequired' in value) || isBoolean(value.accessibilityRequired)) &&
      (!('maxDistanceKm' in value) || finiteBetween(value.maxDistanceKm, 0.1, 100));
  },
  RANK_MERCHANTS: (value) => isRecord(value) && exactKeys(value, ['candidateIds', 'strategy']) && validateCandidateIds(value.candidateIds) && oneOf(value.strategy, ['DISTANCE', 'RELEVANCE', 'BALANCED'] as const),
  GET_MERCHANT_DETAILS: (value) => isRecord(value) && exactKeys(value, ['merchantId']) && validateMerchantId(value.merchantId),
  CALCULATE_DISTANCE: (value) => isRecord(value) && exactKeys(value, ['merchantId', 'origin']) && validateMerchantId(value.merchantId) && validateLocation(value.origin),
  COMPARE_MERCHANTS: (value) => isRecord(value) && exactKeys(value, ['merchantIds']) && validateCandidateIds(value.merchantIds, 2, 3),
  ASK_CLARIFICATION: (value) => isRecord(value) && exactKeys(value, ['missingFields', 'questionKey']) && uniqueStrings(value.missingFields, { min: 1, max: 4 }) && (value.missingFields as unknown[]).every((item) => oneOf(item, ['query', 'city', 'location', 'category'] as const)) && oneOf(value.questionKey, ['ASK_NEED', 'ASK_LOCATION', 'ASK_CATEGORY'] as const),
  RETURN_NO_RESULT: (value) => isRecord(value) && exactKeys(value, ['reason']) && oneOf(value.reason, ['NO_ACTIVE_CANDIDATE', 'INSUFFICIENT_EVIDENCE', 'FILTERS_TOO_STRICT'] as const),
  OPEN_MERCHANT_CARD: (value) => isRecord(value) && exactKeys(value, ['merchantId']) && validateMerchantId(value.merchantId),
  HAND_OFF_TO_ROUTE: (value) => isRecord(value) && exactKeys(value, ['merchantId', 'travelMode']) && validateMerchantId(value.merchantId) && oneOf(value.travelMode, ['WALK', 'WHEELCHAIR'] as const),
};

export function validateAction(value: unknown): ValidationResult<YootChatAction> {
  if (!isRecord(value) || !exactKeys(value, ['action', 'params'])) return fail('action shape');
  if (!oneOf(value.action, YOOTCHAT_ACTIONS)) return { ok: false, code: 'FORBIDDEN_ACTION', errors: ['unknown or forbidden action'] };
  if (!actionParamValidators[value.action](value.params)) return fail('invalid action params');
  return ok(value as unknown as YootChatAction);
}

export function validateActionPlan(value: unknown): ValidationResult<ActionPlan> {
  if (!isRecord(value) || !exactKeys(value, ['topic', 'steps']) || !isYootChatTopic(value.topic) || !Array.isArray(value.steps) || value.steps.length > 10) return fail('plan shape');
  for (const step of value.steps) if (!validateAction(step).ok) return fail('invalid plan action');
  return ok(value as unknown as ActionPlan);
}

const validateFacts = (value: unknown) => {
  if (!isRecord(value) || !exactKeys(value, ['name', 'category', 'city', 'openNow', 'rating', 'accessibility', 'services', 'equipment', 'officialCommitments'])) return false;
  return nonEmptyString(value.name, 200) && nonEmptyString(value.category, 120) &&
    nullable(value.city, (input): input is string => nonEmptyString(input, 120)) &&
    nullable(value.openNow, isBoolean) &&
    nullable(value.rating, (input): input is number => finiteBetween(input, 0, 5)) &&
    oneOf(value.accessibility, ['VERIFIED_ACCESSIBLE', 'VERIFIED_NOT_ACCESSIBLE', 'UNKNOWN'] as const) &&
    uniqueStrings(value.services) && uniqueStrings(value.equipment) && uniqueStrings(value.officialCommitments);
};

export function validateCandidate(value: unknown): ValidationResult<MerchantCandidate> {
  if (!isRecord(value) || !exactKeys(value, ['id', 'status', 'distanceKm', 'facts'])) return fail('candidate shape');
  if (!validateMerchantId(value.id) || value.status !== 'active') return fail('inactive or invalid candidate');
  if (!nullable(value.distanceKm, (input): input is number => finiteBetween(input, 0, 1_000))) return fail('distanceKm');
  if (!validateFacts(value.facts)) return fail('candidate facts');
  return ok(value as unknown as MerchantCandidate);
}

const expectedClaim = (candidate: MerchantCandidate, claim: MerchantClaim): unknown => {
  switch (claim.field) {
    case 'name': return candidate.facts.name;
    case 'category': return candidate.facts.category;
    case 'city': return candidate.facts.city;
    case 'openNow': return candidate.facts.openNow;
    case 'rating': return candidate.facts.rating;
    case 'accessibility': return candidate.facts.accessibility;
    case 'service': return candidate.facts.services.includes(String(claim.value)) ? claim.value : undefined;
    case 'equipment': return candidate.facts.equipment.includes(String(claim.value)) ? claim.value : undefined;
    case 'officialCommitment': return candidate.facts.officialCommitments.includes(String(claim.value)) ? claim.value : undefined;
    case 'distanceKm': return candidate.distanceKm;
  }
};

const expectedSourceField: Record<MerchantClaim['field'], string> = {
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

export function validateClaim(value: unknown, candidate: MerchantCandidate): ValidationResult<MerchantClaim> {
  if (!isRecord(value) || !exactKeys(value, ['field', 'value', 'status', 'evidence']) || !oneOf(value.field, CLAIM_FIELDS)) return fail('claim shape');
  if (!oneOf(value.status, ['VERIFIED', 'UNKNOWN', 'FORBIDDEN'] as const)) return fail('claim status');
  if (!isRecord(value.evidence) || !exactKeys(value.evidence, ['level', 'origin', 'sourceField'], ['observedAt'])) return fail('evidence shape');
  if (!oneOf(value.evidence.level, EVIDENCE_LEVELS) || !oneOf(value.evidence.origin, ['YOOTOO_DATABASE', 'SERVER_CALCULATION', 'OFFICIAL_SOURCE'] as const) || !nonEmptyString(value.evidence.sourceField, 160)) return fail('evidence');
  // FORBIDDEN is an input quarantine marker, never a publishable claim.
  if (value.status === 'FORBIDDEN' || value.evidence.level === 'FORBIDDEN') return fail('forbidden claim cannot be published');
  if (value.evidence.sourceField !== expectedSourceField[value.field]) return fail('evidence source field');
  if (value.field === 'distanceKm' && value.evidence.origin !== 'SERVER_CALCULATION') return fail('distance origin');
  if (value.field === 'officialCommitment' && value.evidence.origin !== 'OFFICIAL_SOURCE') return fail('official commitment origin');
  if ('observedAt' in value.evidence && (typeof value.evidence.observedAt !== 'string' || Number.isNaN(Date.parse(value.evidence.observedAt)))) return fail('observedAt');
  if (value.status === 'VERIFIED') {
    if (value.evidence.level !== 'VERIFIED') return fail('verified claim requires verified evidence');
    const expected = expectedClaim(candidate, value as unknown as MerchantClaim);
    if (expected === undefined || expected === null || value.value !== expected) return fail('claim contradicts structured candidate data');
    if (value.field === 'accessibility' && candidate.facts.accessibility === 'UNKNOWN') return fail('unknown accessibility');
  } else if (value.status === 'UNKNOWN') {
    if (value.evidence.level !== 'UNKNOWN' || value.value !== null) return fail('unknown claim must remain null');
  }
  return ok(value as unknown as MerchantClaim);
}

export function validateReturnedIds(ids: unknown, candidates: readonly MerchantCandidate[]) {
  if (!uniqueStrings(ids, { max: candidates.length })) return fail<readonly string[]>('ids invalid or duplicated');
  const allowed = new Set(candidates.map((candidate) => candidate.id));
  if (!(ids as string[]).every((id) => allowed.has(id))) return fail<readonly string[]>('invented id');
  return ok(ids as readonly string[]);
}

export function validateRecommendation(value: unknown, candidates: readonly MerchantCandidate[]): ValidationResult<MerchantRecommendation> {
  if (!isRecord(value) || !exactKeys(value, ['merchantId', 'rank', 'distanceKm', 'reasons'])) return fail('recommendation shape');
  const candidate = candidates.find((item) => item.id === value.merchantId);
  if (!candidate) return fail('invented merchant id');
  if (!Number.isInteger(value.rank) || (value.rank as number) < 1 || (value.rank as number) > 3) return fail('rank');
  if (value.distanceKm !== candidate.distanceKm) return fail('modified distance');
  if (!Array.isArray(value.reasons) || value.reasons.length === 0) return fail('missing reasons');
  for (const claim of value.reasons) if (!validateClaim(claim, candidate).ok) return fail('invalid claim');
  return ok(value as unknown as MerchantRecommendation);
}

const forbiddenKeyPattern = /(^|_)(email|phone|token|secret|password|userId|internal)(_|$)/i;
export function detectForbiddenFields(value: unknown, path = '$'): readonly string[] {
  if (Array.isArray(value)) return value.flatMap((item, index) => detectForbiddenFields(item, `${path}[${index}]`));
  if (!isRecord(value)) return [];
  return Object.entries(value).flatMap(([key, child]) => [
    ...(forbiddenKeyPattern.test(key) ? [`${path}.${key}`] : []),
    ...detectForbiddenFields(child, `${path}.${key}`),
  ]);
}

const validateMessage = (value: unknown, recommendationCount: number, limitationCount: number) => {
  if (!isRecord(value) || !exactKeys(value, ['template', 'variables']) || !oneOf(value.template, ['RESULTS_FOUND', 'CLARIFICATION_REQUIRED', 'NO_RESULT', 'OUT_OF_SCOPE', 'SERVICE_UNAVAILABLE'] as const)) return false;
  if (!isRecord(value.variables) || !exactKeys(value.variables, [], ['resultCount', 'limitationCount'])) return false;
  if (value.template === 'RESULTS_FOUND' && !('resultCount' in value.variables)) return false;
  if (value.template !== 'RESULTS_FOUND' && 'resultCount' in value.variables) return false;
  if ('resultCount' in value.variables && (!Number.isInteger(value.variables.resultCount) || value.variables.resultCount !== recommendationCount)) return false;
  if ('limitationCount' in value.variables) {
    if (limitationCount === 0 || !Number.isInteger(value.variables.limitationCount) || value.variables.limitationCount !== limitationCount) return false;
  }
  return true;
};

export function validateFinalResponse(value: unknown, candidates: readonly MerchantCandidate[]): ValidationResult<FinalResponse> {
  if (!isRecord(value) || !exactKeys(value, ['topic', 'message', 'recommendations', 'limitations', 'interfaceActions'])) return fail('final response shape');
  if (detectForbiddenFields(value).length > 0) return { ok: false, code: 'UNVERIFIABLE_RESULT', errors: ['forbidden output field'] };
  if (!Array.isArray(value.limitations)) return fail('limitations');
  if (!isYootChatTopic(value.topic) || !Array.isArray(value.recommendations) || value.recommendations.length > 3 || !validateMessage(value.message, value.recommendations.length, value.limitations.length)) return fail('final response core');
  const candidateResults = candidates.map(validateCandidate);
  if (candidateResults.some((result) => !result.ok)) return fail('invalid candidate context');
  if (new Set(candidates.map((candidate) => candidate.id)).size !== candidates.length) return fail('duplicate candidate ids');
  for (const recommendation of value.recommendations) if (!validateRecommendation(recommendation, candidates).ok) return fail('invalid recommendation');
  const ids = value.recommendations.map((item) => (item as MerchantRecommendation).merchantId);
  const ranks = value.recommendations.map((item) => (item as MerchantRecommendation).rank);
  if (new Set(ids).size !== ids.length || ranks.some((rank, index) => rank !== index + 1)) return fail('non-deterministic ranks or duplicate ids');
  const messageTemplate = (value.message as { template: string }).template;
  if ((value.recommendations.length > 0) !== (messageTemplate === 'RESULTS_FOUND')) return fail('message/result mismatch');
  if (['CLARIFICATION', 'NO_RESULT', 'OUT_OF_SCOPE'].includes(value.topic as string) && value.recommendations.length > 0) return fail('topic/result mismatch');
  if (!uniqueStrings(value.limitations) || !value.limitations.every((item) => oneOf(item, ['UNKNOWN_HOURS', 'UNKNOWN_ACCESSIBILITY', 'UNKNOWN_DISTANCE', 'INSUFFICIENT_EVIDENCE'] as const))) return fail('limitations');
  if (!Array.isArray(value.interfaceActions)) return fail('interfaceActions');
  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  const recommendedIds = new Set(ids);
  for (const action of value.interfaceActions) {
    const result = validateAction(action);
    if (!result.ok || (result.value.action !== 'OPEN_MERCHANT_CARD' && result.value.action !== 'HAND_OFF_TO_ROUTE')) return fail('invalid interface action');
    if (!candidateIds.has(result.value.params.merchantId) || !recommendedIds.has(result.value.params.merchantId)) return fail('interface action references absent merchant');
  }
  return ok(value as unknown as FinalResponse);
}
