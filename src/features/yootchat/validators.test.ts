import {
  createSafeFallback,
  detectForbiddenFields,
  validateAction,
  validateActionPlan,
  validateCandidate,
  validateClaim,
  validateFinalResponse,
  validateRecommendation,
  validateRequest,
  validateReturnedIds,
  validateTopic,
  type FinalResponse,
  type MerchantCandidate,
  type MerchantClaim,
} from '.';

const candidate: MerchantCandidate = {
  id: 'merchant-1',
  status: 'active',
  distanceKm: 1.2,
  facts: {
    name: 'Boulangerie du Centre',
    category: 'Boulangerie',
    city: 'Quissac',
    openNow: null,
    rating: 4.5,
    accessibility: 'VERIFIED_ACCESSIBLE',
    services: ['Commande en ligne'],
    equipment: ['Rampe fixe'],
    officialCommitments: ['Agriculture biologique'],
  },
};

const claim = (field: MerchantClaim['field'], value: MerchantClaim['value'], origin: MerchantClaim['evidence']['origin'] = 'YOOTOO_DATABASE'): MerchantClaim => ({
  field,
  value,
  status: 'VERIFIED',
  evidence: {
    level: 'VERIFIED',
    origin,
    sourceField: {
      name: 'facts.name', category: 'facts.category', city: 'facts.city', openNow: 'facts.openNow',
      rating: 'facts.rating', accessibility: 'facts.accessibility', service: 'facts.services',
      equipment: 'facts.equipment', officialCommitment: 'facts.officialCommitments', distanceKm: 'distanceKm',
    }[field],
  },
});

const recommendation = {
  merchantId: candidate.id,
  rank: 1,
  distanceKm: 1.2,
  reasons: [claim('name', candidate.facts.name)],
} as const;

const response: FinalResponse = {
  topic: 'DISCOVER_LOCAL',
  message: { template: 'RESULTS_FOUND', variables: { resultCount: 1 } },
  recommendations: [recommendation],
  limitations: ['UNKNOWN_HOURS'],
  interfaceActions: [{ action: 'OPEN_MERCHANT_CARD', params: { merchantId: candidate.id } }],
};

describe('YootChat v2 strict domain validators', () => {
  test('accepts a complete valid request', () => {
    expect(validateRequest({ message: 'Une boulangerie', language: 'fr', city: 'Quissac', radiusKm: 10, location: { latitude: 43.91, longitude: 4, precision: 'APPROXIMATE' }, filters: { categoryIds: ['bakery'], openNow: true, accessibilityRequired: false, maxDistanceKm: 12 } }).ok).toBe(true);
  });

  test.each([
    [{ message: '', language: 'fr' }, 'empty message'],
    [{ message: 'x'.repeat(2001), language: 'fr' }, 'long message'],
    [{ message: 'test', language: 'fr', extra: true }, 'extra request property'],
    [{ message: 'test', language: 'fr', city: '' }, 'invalid city'],
    [{ message: 'test', language: 'fr', radiusKm: 101 }, 'radius limit'],
    [{ message: 'test', language: 'fr', filters: {} }, 'empty filters'],
    [{ message: 'test', language: 'fr', filters: { openNow: 'yes' } }, 'mistyped filter'],
    [{ message: 'test', language: 'fr', filters: { categoryIds: [] } }, 'empty categories'],
    [{ message: 'test', language: 'fr', filters: { categoryIds: ['a', 'a'] } }, 'duplicate categories'],
    [{ message: 'test', language: 'fr', filters: { maxDistanceKm: -1 } }, 'distance limit'],
  ])('rejects invalid request: %s (%s)', (input, _description) => expect(validateRequest(input).ok).toBe(false));

  test('rejects an unknown topic', () => expect(validateTopic('SHOPPING').ok).toBe(false));

  test('accepts exact discriminated action parameters', () => {
    expect(validateAction({ action: 'RANK_MERCHANTS', params: { candidateIds: ['merchant-1'], strategy: 'DISTANCE' } }).ok).toBe(true);
  });

  test.each([
    [{ action: 'BUY', params: {} }, 'unknown engaging action'],
    [{ action: 'GET_MERCHANT_DETAILS', params: {} }, 'missing params'],
    [{ action: 'GET_MERCHANT_DETAILS', params: { merchantId: 'merchant-1', extra: true } }, 'unknown params'],
    [{ action: 'RANK_MERCHANTS', params: { candidateIds: ['merchant-1'], strategy: 'FASTEST' } }, 'wrong enum'],
    [{ action: 'FILTER_MERCHANTS', params: { candidateIds: ['merchant-1'], maxDistanceKm: 101 } }, 'out of limits'],
    [{ action: 'COMPARE_MERCHANTS', params: { merchantIds: ['merchant-1'] } }, 'too few compare ids'],
    [{ action: 'HAND_OFF_TO_ROUTE', params: { merchantId: 'merchant-1', travelMode: 'CAR' } }, 'forbidden travel mode'],
  ])('rejects invalid action: %s (%s)', (input, _description) => expect(validateAction(input).ok).toBe(false));

  test('validates every action in a plan', () => {
    expect(validateActionPlan({ topic: 'CLARIFICATION', steps: [{ action: 'ASK_CLARIFICATION', params: { missingFields: ['city'], questionKey: 'ASK_LOCATION' } }] }).ok).toBe(true);
    expect(validateActionPlan({ topic: 'DISCOVER_LOCAL', steps: [{ action: 'PAY', params: {} }] }).ok).toBe(false);
  });

  test('accepts a fully structured active candidate', () => expect(validateCandidate(candidate).ok).toBe(true));

  test.each([
    [{ ...candidate, status: 'pending' }, 'inactive'],
    [{ ...candidate, distanceKm: -1 }, 'negative distance'],
    [{ ...candidate, facts: { ...candidate.facts, rating: 5.1 } }, 'rating out of bounds'],
    [{ ...candidate, facts: { ...candidate.facts, accessibility: 'MAYBE' } }, 'invalid accessibility'],
    [{ ...candidate, facts: { ...candidate.facts, services: ['Livraison', 'Livraison'] } }, 'duplicate service'],
    [{ ...candidate, facts: { ...candidate.facts, equipment: [''] } }, 'empty equipment'],
    [{ ...candidate, facts: { ...candidate.facts, extra: 'hidden' } }, 'extra fact'],
    [{ ...candidate, internal: 'hidden' }, 'extra candidate property'],
  ])('rejects invalid candidate: %s (%s)', (input, _description) => expect(validateCandidate(input).ok).toBe(false));

  test.each([
    [claim('service', 'Livraison'), 'invented service'],
    [claim('equipment', 'Ascenseur'), 'invented equipment'],
    [claim('officialCommitment', 'ESS'), 'invented official commitment'],
    [claim('accessibility', 'UNKNOWN'), 'unproved accessibility'],
    [claim('openNow', true), 'invented hours'],
    [{ ...claim('rating', 4.5), evidence: { level: 'MEDIUM', origin: 'YOOTOO_DATABASE', sourceField: 'facts.rating' } }, 'medium presented as verified'],
    [{ ...claim('rating', 4.5), evidence: { level: 'VERIFIED', origin: 'YOOTOO_DATABASE', sourceField: 'facts.name' } }, 'contradictory source field'],
  ])('rejects unsupported claim: %s (%s)', (input, _description) => expect(validateClaim(input, candidate).ok).toBe(false));

  test('accepts exact structured services, equipment and official commitments', () => {
    expect(validateClaim(claim('service', 'Commande en ligne'), candidate).ok).toBe(true);
    expect(validateClaim(claim('equipment', 'Rampe fixe'), candidate).ok).toBe(true);
    expect(validateClaim(claim('officialCommitment', 'Agriculture biologique', 'OFFICIAL_SOURCE'), candidate).ok).toBe(true);
  });

  test('requires unknown facts to remain explicit null', () => {
    expect(validateClaim({ field: 'openNow', value: null, status: 'UNKNOWN', evidence: { level: 'UNKNOWN', origin: 'YOOTOO_DATABASE', sourceField: 'facts.openNow' } }, candidate).ok).toBe(true);
    expect(validateClaim({ field: 'openNow', value: 'probablement', status: 'UNKNOWN', evidence: { level: 'UNKNOWN', origin: 'YOOTOO_DATABASE', sourceField: 'facts.openNow' } }, candidate).ok).toBe(false);
  });

  test('rejects invented and duplicated identifiers', () => {
    expect(validateReturnedIds(['merchant-1'], [candidate]).ok).toBe(true);
    expect(validateReturnedIds(['invented'], [candidate]).ok).toBe(false);
    expect(validateReturnedIds(['merchant-1', 'merchant-1'], [candidate]).ok).toBe(false);
  });

  test('rejects a modified deterministic distance', () => {
    expect(validateRecommendation({ ...recommendation, distanceKm: 1.3 }, [candidate]).ok).toBe(false);
  });

  test('validates the full final response', () => expect(validateFinalResponse(response, [candidate]).ok).toBe(true));

  test('rejects duplicated candidate context', () => expect(validateFinalResponse(response, [candidate, candidate]).ok).toBe(false));

  test.each([
    [{ ...response, extra: true }, 'extra response property'],
    [{ ...response, recommendations: [{ ...recommendation, merchantId: 'invented' }] }, 'invented recommendation id'],
    [{ ...response, recommendations: [{ ...recommendation, rank: 2 }] }, 'non deterministic rank'],
    [{ ...response, interfaceActions: [{ action: 'OPEN_MERCHANT_CARD', params: { merchantId: 'absent' } }] }, 'absent interface target'],
    [{ ...response, interfaceActions: [{ action: 'HAND_OFF_TO_ROUTE', params: { merchantId: 'merchant-1', travelMode: 'CAR' } }] }, 'invalid interface params'],
    [{ ...response, email: 'private@example.test' }, 'forbidden personal field'],
    [{ ...response, message: 'Ce commerce possède un parking inventé.' }, 'free text as hidden assertion'],
    [{ ...response, message: { template: 'RESULTS_FOUND', variables: { resultCount: 1, service: 'invented' } } }, 'claim hidden in message variables'],
  ])('rejects unsafe final response: %s (%s)', (input, _description) => expect(validateFinalResponse(input, [candidate]).ok).toBe(false));

  test('detects nested forbidden fields', () => expect(detectForbiddenFields({ safe: { user_email: 'x' } })).toEqual(['$.safe.user_email']));

  test('creates deterministic safe fallbacks with no claims or actions', () => {
    expect(createSafeFallback('UNAVAILABLE')).toEqual({ topic: 'NO_RESULT', message: { template: 'SERVICE_UNAVAILABLE', variables: {} }, recommendations: [], limitations: [], interfaceActions: [] });
  });
});
