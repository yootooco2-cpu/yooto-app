import { GATE_0_SCENARIO_MATRIX, validateScenarioMatrix } from './scenarioMatrix';

describe('Gate 0 scenario compatibility matrix', () => {
  test('covers S01 through S30 exactly once', () => {
    expect(validateScenarioMatrix()).toBe(true);
    expect(GATE_0_SCENARIO_MATRIX).toHaveLength(30);
    expect(GATE_0_SCENARIO_MATRIX.every(([, , contracts]) => contracts.length > 0)).toBe(true);
  });
});
