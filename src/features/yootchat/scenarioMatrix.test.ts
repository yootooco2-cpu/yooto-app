import goldenSetJson from './golden-test-set-v2.json';
import {
  createSafeFallback,
  validateAction,
  validateCandidate,
  validateClaim,
  validateFinalResponse,
  validateGoldenTestSetV2,
  validateRecommendation,
  validateRequest,
  validateReturnedIds,
  validateTopic,
  type FinalResponse,
  type GoldenScenarioV2,
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
    accessibility: 'UNKNOWN',
    services: ['Commande en ligne'],
    equipment: ['Rampe fixe'],
    officialCommitments: ['Agriculture biologique'],
  },
};

const verifiedClaim = (
  field: MerchantClaim['field'],
  value: MerchantClaim['value'],
  sourceField: string,
  origin: MerchantClaim['evidence']['origin'] = 'YOOTOO_DATABASE',
): MerchantClaim => ({ field, value, status: 'VERIFIED', evidence: { level: 'VERIFIED', origin, sourceField } });

const recommendation = {
  merchantId: candidate.id,
  rank: 1,
  distanceKm: candidate.distanceKm,
  reasons: [verifiedClaim('name', candidate.facts.name, 'facts.name')],
} as const;

const response: FinalResponse = {
  topic: 'DISCOVER_LOCAL',
  message: { template: 'RESULTS_FOUND', variables: { resultCount: 1, limitationCount: 1 } },
  recommendations: [recommendation],
  limitations: ['UNKNOWN_HOURS'],
  interfaceActions: [{ action: 'OPEN_MERCHANT_CARD', params: { merchantId: candidate.id } }],
};

const forbiddenClaim = (overrides: Partial<MerchantClaim> = {}): MerchantClaim => ({
  field: 'service',
  value: 'Arbitrary value',
  status: 'FORBIDDEN',
  evidence: { level: 'FORBIDDEN', origin: 'YOOTOO_DATABASE', sourceField: 'facts.services' },
  ...overrides,
});

type Behavior = () => boolean;
const behaviors: Readonly<Record<string, Behavior>> = {
  VALID_REQUEST: () => validateRequest({ message: 'Une boulangerie locale', language: 'fr' }).ok,
  REQUEST_800_ACCEPTED: () => validateRequest({ message: 'x'.repeat(800), language: 'fr' }).ok,
  REQUEST_801_REJECTED: () => !validateRequest({ message: 'x'.repeat(801), language: 'fr' }).ok,
  UNKNOWN_TOPIC_REJECTED: () => !validateTopic('UNKNOWN_TOPIC').ok,
  UNKNOWN_ACTION_REJECTED: () => !validateAction({ action: 'PAY', params: {} }).ok,
  ACTION_PARAMS_REJECTED: () => !validateAction({ action: 'GET_MERCHANT_DETAILS', params: { candidateIds: ['merchant-1'] } }).ok,
  EXTRA_PROPERTY_REJECTED: () => !validateRequest({ message: 'test', language: 'fr', email: 'private@example.test' }).ok,
  INVALID_FILTER_REJECTED: () => !validateRequest({ message: 'test', language: 'fr', filters: { openNow: 'yes' } }).ok,
  INACTIVE_CANDIDATE_REJECTED: () => !validateCandidate({ ...candidate, status: 'pending' }).ok,
  INVENTED_ID_REJECTED: () => !validateReturnedIds(['invented'], [candidate]).ok,
  DUPLICATE_ID_REJECTED: () => !validateReturnedIds([candidate.id, candidate.id], [candidate]).ok,
  RATING_OUT_OF_RANGE_REJECTED: () => !validateCandidate({ ...candidate, facts: { ...candidate.facts, rating: 5.1 } }).ok,
  INVALID_DISTANCE_REJECTED: () => !validateCandidate({ ...candidate, distanceKm: -1 }).ok,
  MODIFIED_DISTANCE_REJECTED: () => !validateRecommendation({ ...recommendation, distanceKm: 1.3 }, [candidate]).ok,
  INVENTED_SERVICE_REJECTED: () => !validateClaim(verifiedClaim('service', 'Livraison', 'facts.services'), candidate).ok,
  INVENTED_EQUIPMENT_REJECTED: () => !validateClaim(verifiedClaim('equipment', 'Ascenseur', 'facts.equipment'), candidate).ok,
  UNPROVED_ACCESSIBILITY_REJECTED: () => !validateClaim(verifiedClaim('accessibility', 'UNKNOWN', 'facts.accessibility'), candidate).ok,
  INVENTED_COMMITMENT_REJECTED: () => !validateClaim(verifiedClaim('officialCommitment', 'ESS', 'facts.officialCommitments', 'OFFICIAL_SOURCE'), candidate).ok,
  MISSING_EVIDENCE_REJECTED: () => !validateClaim({ ...verifiedClaim('rating', 4.5, 'facts.rating'), evidence: { level: 'UNKNOWN', origin: 'YOOTOO_DATABASE', sourceField: 'facts.rating' } }, candidate).ok,
  CONTRADICTORY_EVIDENCE_REJECTED: () => !validateClaim(verifiedClaim('rating', 4.5, 'facts.name'), candidate).ok,
  FORBIDDEN_STATUS_REJECTED: () => !validateClaim(forbiddenClaim(), candidate).ok,
  FORBIDDEN_EVIDENCE_REJECTED: () => !validateClaim(forbiddenClaim({ status: 'VERIFIED' }), candidate).ok,
  FORBIDDEN_REASON_REJECTED: () => !validateRecommendation({ ...recommendation, reasons: [forbiddenClaim()] }, [candidate]).ok,
  NONDETERMINISTIC_RANK_REJECTED: () => !validateFinalResponse({ ...response, recommendations: [{ ...recommendation, rank: 2 }] }, [candidate]).ok,
  ABSENT_INTERFACE_TARGET_REJECTED: () => !validateFinalResponse({ ...response, interfaceActions: [{ action: 'OPEN_MERCHANT_CARD', params: { merchantId: 'absent' } }] }, [candidate]).ok,
  PERSONAL_FIELD_REJECTED: () => !validateFinalResponse({ ...response, user_email: 'private@example.test' }, [candidate]).ok,
  FREE_TEXT_EVIDENCE_REJECTED: () => !validateFinalResponse({ ...response, message: 'Rampe probablement disponible' }, [candidate]).ok,
  LIMITATION_COUNT_MISMATCH_REJECTED: () => !validateFinalResponse({ ...response, message: { template: 'RESULTS_FOUND', variables: { resultCount: 1, limitationCount: 0 } } }, [candidate]).ok,
  NO_RESULT_FALLBACK_SAFE: () => {
    const fallback = createSafeFallback('EMPTY');
    return fallback.message.template === 'NO_RESULT' && fallback.recommendations.length === 0 && fallback.interfaceActions.length === 0;
  },
  UNAVAILABLE_FALLBACK_SAFE: () => {
    const fallback = createSafeFallback('UNAVAILABLE');
    return fallback.message.template === 'SERVICE_UNAVAILABLE' && fallback.recommendations.length === 0 && fallback.interfaceActions.length === 0;
  },
};

const executableBehaviors = new Set(Object.keys(behaviors));
const goldenSet = goldenSetJson as unknown;

describe('YOOTCHAT_GOLDEN_TEST_SET_V2 integrity', () => {
  test('is the official complete and executable V2 set', () => {
    expect(validateGoldenTestSetV2(goldenSet, executableBehaviors)).toBe(true);
  });

  test('rejects an absent scenario', () => {
    const altered = structuredClone(goldenSetJson);
    altered.scenarios.pop();
    expect(validateGoldenTestSetV2(altered, executableBehaviors)).toBe(false);
  });

  test('rejects a duplicated scenario identifier', () => {
    const altered = structuredClone(goldenSetJson);
    altered.scenarios[1].id = altered.scenarios[0].id;
    expect(validateGoldenTestSetV2(altered, executableBehaviors)).toBe(false);
  });

  test('rejects a declared invariant without an executable behavior', () => {
    const altered = structuredClone(goldenSetJson);
    altered.scenarios[0].behavior = 'NOT_EXECUTED';
    expect(validateGoldenTestSetV2(altered, executableBehaviors)).toBe(false);
  });
});

describe('30 executable YootChat V2 safety scenarios', () => {
  const scenarios = goldenSetJson.scenarios as readonly GoldenScenarioV2[];
  test.each(scenarios)('$id — $title', ({ behavior }) => {
    expect(behaviors[behavior]).toBeDefined();
    expect(behaviors[behavior]()).toBe(true);
  });
});
