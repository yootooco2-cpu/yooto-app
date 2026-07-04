/// <reference types="jest" />
import type { MapBounds } from '../types';

import { boundsCenter, clamp, fitZoom } from './geo';

const VIEWPORT = { width: 800, height: 600 };

describe('boundsCenter', () => {
  it('renvoie le centre géométrique', () => {
    const b: MapBounds = { west: 3.8, south: 43.5, east: 4.0, north: 43.7 };
    expect(boundsCenter(b)).toEqual({ latitude: 43.6, longitude: 3.9 });
  });
});

describe('fitZoom', () => {
  it('donne un zoom PLUS PETIT pour une emprise plus grande (monotone)', () => {
    const small: MapBounds = { west: 3.86, south: 43.6, east: 3.88, north: 43.62 };
    const large: MapBounds = { west: 3.5, south: 43.3, east: 4.3, north: 43.9 };
    expect(fitZoom(small, VIEWPORT, 40)).toBeGreaterThan(fitZoom(large, VIEWPORT, 40));
  });

  it('un plus grand padding réduit le zoom (moins de place utile)', () => {
    const b: MapBounds = { west: 3.8, south: 43.5, east: 4.0, north: 43.7 };
    expect(fitZoom(b, VIEWPORT, 120)).toBeLessThan(fitZoom(b, VIEWPORT, 0));
  });

  it('emprise dégénérée (span nul) → zoom max', () => {
    const point: MapBounds = { west: 3.87, south: 43.61, east: 3.87, north: 43.61 };
    expect(fitZoom(point, VIEWPORT, 40)).toBe(22);
  });
});

describe('clamp', () => {
  it('borne dans l’intervalle', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-3, 0, 10)).toBe(0);
    expect(clamp(99, 0, 10)).toBe(10);
  });
});
