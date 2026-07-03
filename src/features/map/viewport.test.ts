/// <reference types="jest" />
import type { MapViewport } from './types';
import { isPlausibleViewport } from './viewport';

const OK: MapViewport = {
  center: { latitude: 43.6108, longitude: 3.8767 },
  zoom: 13.2,
  bounds: { west: 3.8, south: 43.55, east: 3.95, north: 43.67 },
};

describe('isPlausibleViewport', () => {
  it('accepte un viewport valide', () => {
    expect(isPlausibleViewport(OK)).toBe(true);
  });

  it('rejette null/undefined', () => {
    expect(isPlausibleViewport(null)).toBe(false);
    expect(isPlausibleViewport(undefined)).toBe(false);
  });

  it('rejette un zoom hors bornes ou non fini', () => {
    expect(isPlausibleViewport({ ...OK, zoom: -1 })).toBe(false);
    expect(isPlausibleViewport({ ...OK, zoom: 99 })).toBe(false);
    expect(isPlausibleViewport({ ...OK, zoom: Number.NaN })).toBe(false);
  });

  it('rejette un centre aberrant', () => {
    expect(isPlausibleViewport({ ...OK, center: { latitude: 200, longitude: 3 } })).toBe(false);
    expect(isPlausibleViewport({ ...OK, center: { latitude: 43, longitude: 999 } })).toBe(false);
  });

  it('rejette des bounds incohérents', () => {
    expect(isPlausibleViewport({ ...OK, bounds: { west: 4, south: 43.55, east: 3.8, north: 43.67 } })).toBe(false);
  });
});
