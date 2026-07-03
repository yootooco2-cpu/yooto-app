/// <reference types="jest" />
import { accuracyToHaloPx } from './mapLocation';

describe('accuracyToHaloPx', () => {
  it('bonne précision → petit halo', () => {
    expect(accuracyToHaloPx(5)).toBe(14);
    expect(accuracyToHaloPx(10)).toBe(14);
  });

  it('mauvaise précision → grand halo (borné)', () => {
    expect(accuracyToHaloPx(150)).toBe(44);
    expect(accuracyToHaloPx(9999)).toBe(44);
  });

  it('précision intermédiaire → halo entre les bornes, croissant', () => {
    const mid = accuracyToHaloPx(80);
    expect(mid).toBeGreaterThan(14);
    expect(mid).toBeLessThan(44);
    expect(accuracyToHaloPx(120)).toBeGreaterThan(accuracyToHaloPx(40));
  });

  it('précision inconnue / invalide → halo modeste (jamais surévalué)', () => {
    expect(accuracyToHaloPx(undefined)).toBe(20);
    expect(accuracyToHaloPx(null)).toBe(20);
    expect(accuracyToHaloPx(0)).toBe(20);
    expect(accuracyToHaloPx(-5)).toBe(20);
    expect(accuracyToHaloPx(Number.NaN)).toBe(20);
  });
});
