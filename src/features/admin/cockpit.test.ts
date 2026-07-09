import { computeHealthScore, healthTone } from './health';

describe('computeHealthScore', () => {
  it('100 si tout est vert et couverture parfaite', () => {
    expect(computeHealthScore({ servicesUp: 6, servicesDegraded: 0, servicesTotal: 6, coverage: 100, hasError: false })).toBe(100);
  });
  it('pénalise les services dégradés / hors service', () => {
    const s = computeHealthScore({ servicesUp: 5, servicesDegraded: 1, servicesTotal: 6, coverage: 96, hasError: false });
    expect(s).toBeGreaterThanOrEqual(90);
    expect(s).toBeLessThan(100);
  });
  it('chute avec une erreur de données', () => {
    const ok = computeHealthScore({ servicesUp: 6, servicesDegraded: 0, servicesTotal: 6, coverage: 96, hasError: false });
    const ko = computeHealthScore({ servicesUp: 6, servicesDegraded: 0, servicesTotal: 6, coverage: 96, hasError: true });
    expect(ko).toBeLessThan(ok);
  });
  it('gère 0 service sans planter', () => {
    expect(computeHealthScore({ servicesUp: 0, servicesDegraded: 0, servicesTotal: 0, coverage: 0, hasError: false })).toBe(25);
  });
});

describe('healthTone', () => {
  it('seuils vert / orange / rouge', () => {
    expect(healthTone(98)).toBe('up');
    expect(healthTone(80)).toBe('degraded');
    expect(healthTone(50)).toBe('down');
  });
});
