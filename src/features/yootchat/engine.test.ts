import {
  runDeterministicYootChatEngine,
  validateFinalResponse,
  type MerchantCandidate,
} from '.';

const candidate = (overrides: Partial<MerchantCandidate> = {}): MerchantCandidate => ({
  id: 'merchant-1',
  status: 'active',
  distanceKm: 1.2,
  facts: {
    name: 'Boulangerie du Centre',
    category: 'Boulangerie',
    city: 'Quissac',
    openNow: true,
    rating: 4.5,
    accessibility: 'VERIFIED_ACCESSIBLE',
    services: ['Commande en ligne'],
    equipment: ['Rampe fixe'],
    officialCommitments: ['Agriculture biologique'],
  },
  ...overrides,
});

const request = {
  message: 'Une boulangerie locale',
  language: 'fr',
  city: 'Quissac',
} as const;

describe('YootChat deterministic engine', () => {
  test('returns a certified final response without external services', () => {
    const result = runDeterministicYootChatEngine({ request, candidates: [candidate()] });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.response.recommendations).toHaveLength(1);
    expect(result.response.recommendations[0].distanceKm).toBe(1.2);
    expect(validateFinalResponse(result.response, result.consideredCandidates).ok).toBe(true);
  });

  test('ranks by known distance, then distance, then known rating, rating and stable id', () => {
    const result = runDeterministicYootChatEngine({
      request,
      candidates: [
        candidate({ id: 'merchant-5', distanceKm: null, facts: { ...candidate().facts, rating: 5 } }),
        candidate({ id: 'merchant-4', distanceKm: 1.2, facts: { ...candidate().facts, rating: null } }),
        candidate({ id: 'merchant-3', distanceKm: 1.2, facts: { ...candidate().facts, rating: 4.7 } }),
        candidate({ id: 'merchant-2', distanceKm: 0.9, facts: { ...candidate().facts, rating: 3.8 } }),
        candidate({ id: 'merchant-1', distanceKm: 1.2, facts: { ...candidate().facts, rating: 4.7 } }),
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.response.recommendations.map((item) => item.merchantId)).toEqual(['merchant-2', 'merchant-1', 'merchant-3']);
  });

  test('quarantines inactive, invalid and duplicated candidates before ranking', () => {
    const duplicate = candidate({ id: 'duplicate' });
    const result = runDeterministicYootChatEngine({
      request,
      candidates: [
        duplicate,
        duplicate,
        { ...candidate({ id: 'pending' }), status: 'pending' },
        candidate({ id: 'merchant-2' }),
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.response.recommendations.map((item) => item.merchantId)).toEqual(['merchant-2']);
    expect(result.quarantinedCandidates.map((item) => item.reason).sort()).toEqual(['DUPLICATE_ID', 'DUPLICATE_ID', 'INVALID_CANDIDATE']);
  });

  test('keeps unknown accessibility cautious and refuses it when PMR is required', () => {
    const unknownAccessibility = candidate({
      id: 'unknown-accessibility',
      facts: { ...candidate().facts, accessibility: 'UNKNOWN' },
    });
    const permissive = runDeterministicYootChatEngine({ request, candidates: [unknownAccessibility] });
    const strict = runDeterministicYootChatEngine({
      request: { ...request, filters: { accessibilityRequired: true } },
      candidates: [unknownAccessibility],
    });

    expect(permissive.ok).toBe(true);
    expect(strict.ok).toBe(true);
    if (!permissive.ok || !strict.ok) return;
    expect(permissive.response.limitations).toContain('UNKNOWN_ACCESSIBILITY');
    expect(strict.response.recommendations).toHaveLength(0);
    expect(strict.quarantinedCandidates).toEqual([{ id: 'unknown-accessibility', reason: 'ACCESSIBILITY_REQUIRED' }]);
  });

  test('returns deterministic safe fallbacks for invalid, empty and out-of-scope requests', () => {
    expect(runDeterministicYootChatEngine({ request: { message: 'x'.repeat(801), language: 'fr' }, candidates: [] }).response.message.template).toBe('CLARIFICATION_REQUIRED');
    expect(runDeterministicYootChatEngine({ request, candidates: [] }).response.message.template).toBe('NO_RESULT');
    expect(runDeterministicYootChatEngine({ request: { message: 'Reserve et paie cette table', language: 'fr' }, candidates: [candidate()] }).response.message.template).toBe('OUT_OF_SCOPE');
  });

  test('is deterministic across repeated executions', () => {
    const input = {
      request,
      candidates: [
        candidate({ id: 'merchant-3', distanceKm: 2 }),
        candidate({ id: 'merchant-1', distanceKm: 1 }),
        candidate({ id: 'merchant-2', distanceKm: 1 }),
      ],
    };
    const first = JSON.stringify(runDeterministicYootChatEngine(input));
    for (let index = 0; index < 20; index += 1) {
      expect(JSON.stringify(runDeterministicYootChatEngine(input))).toBe(first);
    }
  });
});
