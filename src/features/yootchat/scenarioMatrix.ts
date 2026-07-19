export const GOLDEN_TEST_SET_V2_NAME = 'YOOTCHAT_GOLDEN_TEST_SET_V2' as const;
export const LEGACY_GOLDEN_SET_STATUS = 'LEGACY_GOLDEN_SET_UNRECOVERABLE' as const;

export interface GoldenScenarioV2 {
  readonly id: string;
  readonly title: string;
  readonly invariant: string;
  readonly behavior: string;
}

export interface GoldenTestSetV2 {
  readonly name: typeof GOLDEN_TEST_SET_V2_NAME;
  readonly version: 2;
  readonly provenance: string;
  readonly scenarios: readonly GoldenScenarioV2[];
}

export function validateGoldenTestSetV2(
  value: unknown,
  executableBehaviors: ReadonlySet<string>,
): value is GoldenTestSetV2 {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (record.name !== GOLDEN_TEST_SET_V2_NAME || record.version !== 2 || typeof record.provenance !== 'string') return false;
  if (!Array.isArray(record.scenarios) || record.scenarios.length !== 30) return false;
  const ids = new Set<string>();
  const behaviors = new Set<string>();
  return record.scenarios.every((scenario, index) => {
    if (typeof scenario !== 'object' || scenario === null || Array.isArray(scenario)) return false;
    const item = scenario as Record<string, unknown>;
    if (Object.keys(item).length !== 4 || !['id', 'title', 'invariant', 'behavior'].every((key) => key in item)) return false;
    const expectedId = `V2-S${String(index + 1).padStart(2, '0')}`;
    if (item.id !== expectedId || typeof item.title !== 'string' || item.title.length === 0 || typeof item.invariant !== 'string' || item.invariant.length === 0 || typeof item.behavior !== 'string') return false;
    if (ids.has(item.id) || behaviors.has(item.behavior) || !executableBehaviors.has(item.behavior)) return false;
    ids.add(item.id);
    behaviors.add(item.behavior);
    return true;
  });
}
