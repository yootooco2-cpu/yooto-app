import { runDeterministicYootChatEngine, type DeterministicEngineResult, type MerchantCandidate } from '.';

const baseFacts: MerchantCandidate['facts'] = {
  name: 'Boulangerie du Centre',
  category: 'Boulangerie',
  city: 'Quissac',
  openNow: true,
  rating: 4.5,
  accessibility: 'VERIFIED_ACCESSIBLE',
  services: ['Commande en ligne'],
  equipment: ['Rampe fixe'],
  officialCommitments: ['Agriculture biologique'],
};

const merchant = (id: string, overrides: Partial<MerchantCandidate> = {}): MerchantCandidate => ({
  id,
  status: 'active',
  distanceKm: 1,
  facts: baseFacts,
  ...overrides,
});

const run = (overrides: {
  readonly message?: string;
  readonly city?: string;
  readonly filters?: Record<string, unknown>;
  readonly candidates?: readonly unknown[];
} = {}): DeterministicEngineResult => runDeterministicYootChatEngine({
  request: {
    message: overrides.message ?? 'Trouve une boulangerie locale',
    language: 'fr',
    ...(overrides.city ? { city: overrides.city } : {}),
    ...(overrides.filters ? { filters: overrides.filters } : {}),
  },
  candidates: overrides.candidates ?? [merchant('merchant-1')],
});

type BusinessScenario = {
  readonly id: string;
  readonly title: string;
  readonly behavior: () => boolean;
};

const okResult = (result: DeterministicEngineResult) => result.ok ? result : null;

const scenarios: readonly BusinessScenario[] = [
  { id: 'L3-B01', title: 'valid request returns one local recommendation', behavior: () => okResult(run())?.response.recommendations.length === 1 },
  { id: 'L3-B02', title: 'inactive merchant is excluded', behavior: () => okResult(run({ candidates: [{ ...merchant('merchant-1'), status: 'pending' }] }))?.response.recommendations.length === 0 },
  { id: 'L3-B03', title: 'duplicate ids are quarantined', behavior: () => okResult(run({ candidates: [merchant('same'), merchant('same')] }))?.quarantinedCandidates.every((item) => item.reason === 'DUPLICATE_ID') === true },
  { id: 'L3-B04', title: 'maximum three recommendations are returned', behavior: () => okResult(run({ candidates: [merchant('m1'), merchant('m2'), merchant('m3'), merchant('m4')] }))?.response.recommendations.length === 3 },
  { id: 'L3-B05', title: 'known distance beats unknown distance', behavior: () => okResult(run({ candidates: [merchant('unknown', { distanceKm: null }), merchant('known', { distanceKm: 3 })] }))?.response.recommendations[0].merchantId === 'known' },
  { id: 'L3-B06', title: 'shorter known distance ranks first', behavior: () => okResult(run({ candidates: [merchant('far', { distanceKm: 4 }), merchant('near', { distanceKm: 1 })] }))?.response.recommendations[0].merchantId === 'near' },
  { id: 'L3-B07', title: 'known rating beats unknown rating at equal distance', behavior: () => okResult(run({ candidates: [merchant('unknown', { facts: { ...baseFacts, rating: null } }), merchant('rated')] }))?.response.recommendations[0].merchantId === 'rated' },
  { id: 'L3-B08', title: 'higher rating ranks first at equal distance', behavior: () => okResult(run({ candidates: [merchant('low', { facts: { ...baseFacts, rating: 3 } }), merchant('high', { facts: { ...baseFacts, rating: 5 } })] }))?.response.recommendations[0].merchantId === 'high' },
  { id: 'L3-B09', title: 'merchant id is the final stable tiebreaker', behavior: () => okResult(run({ candidates: [merchant('b'), merchant('a')] }))?.response.recommendations[0].merchantId === 'a' },
  { id: 'L3-B10', title: 'exact candidate distance is preserved', behavior: () => okResult(run({ candidates: [merchant('precise', { distanceKm: 1.234567 })] }))?.response.recommendations[0].distanceKm === 1.234567 },
  { id: 'L3-B11', title: 'open-now filter accepts open merchant', behavior: () => okResult(run({ filters: { openNow: true } }))?.response.recommendations.length === 1 },
  { id: 'L3-B12', title: 'open-now filter rejects unknown hours', behavior: () => okResult(run({ filters: { openNow: true }, candidates: [merchant('unknown-hours', { facts: { ...baseFacts, openNow: null } })] }))?.response.recommendations.length === 0 },
  { id: 'L3-B13', title: 'category filter accepts matching category', behavior: () => okResult(run({ filters: { categoryIds: ['Boulangerie'] } }))?.response.recommendations.length === 1 },
  { id: 'L3-B14', title: 'category filter rejects mismatching category', behavior: () => okResult(run({ filters: { categoryIds: ['Librairie'] } }))?.quarantinedCandidates[0].reason === 'CATEGORY_MISMATCH' },
  { id: 'L3-B15', title: 'city filter accepts matching city', behavior: () => okResult(run({ city: 'Quissac' }))?.response.recommendations.length === 1 },
  { id: 'L3-B16', title: 'city filter rejects mismatching city', behavior: () => okResult(run({ city: 'Nimes' }))?.quarantinedCandidates[0].reason === 'CITY_MISMATCH' },
  { id: 'L3-B17', title: 'radius rejects unknown distance', behavior: () => okResult(run({ candidates: [merchant('unknown-distance', { distanceKm: null })], filters: { maxDistanceKm: 2 } }))?.quarantinedCandidates[0].reason === 'DISTANCE_UNKNOWN' },
  { id: 'L3-B18', title: 'radius rejects too distant merchant', behavior: () => okResult(run({ candidates: [merchant('far', { distanceKm: 10 })], filters: { maxDistanceKm: 2 } }))?.quarantinedCandidates[0].reason === 'DISTANCE_TOO_FAR' },
  { id: 'L3-B19', title: 'PMR requirement accepts verified accessible merchant', behavior: () => okResult(run({ filters: { accessibilityRequired: true } }))?.topic === 'ACCESSIBILITY' },
  { id: 'L3-B20', title: 'PMR requirement rejects unknown accessibility', behavior: () => okResult(run({ filters: { accessibilityRequired: true }, candidates: [merchant('unknown-a11y', { facts: { ...baseFacts, accessibility: 'UNKNOWN' } })] }))?.response.recommendations.length === 0 },
  { id: 'L3-B21', title: 'unknown accessibility remains a limitation when not required', behavior: () => okResult(run({ candidates: [merchant('unknown-a11y', { facts: { ...baseFacts, accessibility: 'UNKNOWN' } })] }))?.response.limitations.includes('UNKNOWN_ACCESSIBILITY') === true },
  { id: 'L3-B22', title: 'unknown hours become a limitation', behavior: () => okResult(run({ candidates: [merchant('unknown-hours', { facts: { ...baseFacts, openNow: null } })] }))?.response.limitations.includes('UNKNOWN_HOURS') === true },
  { id: 'L3-B23', title: 'unknown distance becomes a limitation without radius filter', behavior: () => okResult(run({ candidates: [merchant('unknown-distance', { distanceKm: null })] }))?.response.limitations.includes('UNKNOWN_DISTANCE') === true },
  { id: 'L3-B24', title: 'structured service is published as verified claim', behavior: () => okResult(run())?.response.recommendations[0].reasons.some((claim) => claim.field === 'service' && claim.value === 'Commande en ligne') === true },
  { id: 'L3-B25', title: 'structured equipment is published as verified claim', behavior: () => okResult(run())?.response.recommendations[0].reasons.some((claim) => claim.field === 'equipment' && claim.value === 'Rampe fixe') === true },
  { id: 'L3-B26', title: 'official commitment uses official evidence origin', behavior: () => okResult(run())?.response.recommendations[0].reasons.some((claim) => claim.field === 'officialCommitment' && claim.evidence.origin === 'OFFICIAL_SOURCE') === true },
  { id: 'L3-B27', title: 'route intent uses route handoff only for recommendation', behavior: () => okResult(run({ message: 'Quel trajet pour aller a cette boulangerie ?' }))?.response.interfaceActions[0].action === 'HAND_OFF_TO_ROUTE' },
  { id: 'L3-B28', title: 'default intent opens merchant card only for recommendation', behavior: () => okResult(run())?.response.interfaceActions[0].action === 'OPEN_MERCHANT_CARD' },
  { id: 'L3-B29', title: 'out-of-scope engaging action has no recommendation', behavior: () => okResult(run({ message: 'Reserve et paie cette commande' }))?.response.recommendations.length === 0 },
  { id: 'L3-B30', title: 'twenty repeated runs produce identical output', behavior: () => {
    const input = { candidates: [merchant('b'), merchant('a'), merchant('c')] };
    const first = JSON.stringify(run(input));
    return Array.from({ length: 20 }).every(() => JSON.stringify(run(input)) === first);
  } },
];

describe('30 executable YootChat Lot 3 business scenarios', () => {
  test('scenario registry is complete and unique', () => {
    expect(scenarios).toHaveLength(30);
    expect(new Set(scenarios.map((scenario) => scenario.id)).size).toBe(30);
  });

  test.each(scenarios)('$id - $title', ({ behavior }) => {
    expect(behavior()).toBe(true);
  });
});
