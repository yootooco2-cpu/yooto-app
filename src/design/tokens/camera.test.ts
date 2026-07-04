/// <reference types="jest" />
import {
  CAMERA_COALESCE_MS,
  CAMERA_DEAD_ZONE,
  CAMERA_DURATION,
  CAMERA_EASING,
  CAMERA_LEVELS,
  TERRITORY_MODIFIER,
  ZOOM_LEVEL_ORDER,
} from './camera';

// Les tokens caméra sont la source unique. Ces invariants figent la cohérence de la hiérarchie
// (zoom croissant, pitch = intimité) et des seuils (anti-tremblement) avant toute Strategy.

describe('durées', () => {
  it('sont positives et strictement ordonnées (instant → epic)', () => {
    const order = ['instant', 'nudge', 'short', 'base', 'medium', 'long', 'epic'] as const;
    const vals = order.map((k) => CAMERA_DURATION[k]);
    expect(vals[0]).toBe(0);
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeGreaterThan(vals[i - 1]);
    }
  });
});

describe('easing', () => {
  it('sont des courbes cubic-bezier valides', () => {
    for (const curve of Object.values(CAMERA_EASING)) {
      expect(curve).toMatch(/^cubic-bezier\(\s*[\d.-]+\s*,\s*[\d.-]+\s*,\s*[\d.-]+\s*,\s*[\d.-]+\s*\)$/);
    }
  });
});

describe('hiérarchie de zoom', () => {
  it('a un zoom STRICTEMENT croissant du territoire au commerce sélectionné', () => {
    const zooms = ZOOM_LEVEL_ORDER.map((n) => CAMERA_LEVELS[n].zoom);
    for (let i = 1; i < zooms.length; i++) {
      expect(zooms[i]).toBeGreaterThan(zooms[i - 1]);
    }
  });

  it('a un pitch non décroissant (le pitch augmente avec l’intimité)', () => {
    const pitches = ZOOM_LEVEL_ORDER.map((n) => CAMERA_LEVELS[n].pitch);
    for (let i = 1; i < pitches.length; i++) {
      expect(pitches[i]).toBeGreaterThanOrEqual(pitches[i - 1]);
    }
  });

  it('reste PLAT en vue large (territoire + ville = 0°) et immersif au commerce sélectionné', () => {
    expect(CAMERA_LEVELS.territory.pitch).toBe(0);
    expect(CAMERA_LEVELS.city.pitch).toBe(0);
    expect(CAMERA_LEVELS.merchantSelected.pitch).toBe(45);
  });

  it('a un padding positif à chaque niveau', () => {
    for (const n of ZOOM_LEVEL_ORDER) {
      expect(CAMERA_LEVELS[n].padding).toBeGreaterThan(0);
    }
  });
});

describe('modificateur territoire', () => {
  it('est neutre par défaut, plus bas en historique, plus haut en grand espace', () => {
    expect(TERRITORY_MODIFIER.neutral).toEqual({ zoom: 0, pitch: 0 });
    expect(TERRITORY_MODIFIER.historic.zoom).toBeGreaterThan(0);
    expect(TERRITORY_MODIFIER.open.zoom).toBeLessThan(0);
  });
});

describe('seuils du scheduler', () => {
  it('sont tous strictement positifs (dead-zone + coalescing)', () => {
    expect(CAMERA_DEAD_ZONE.centerMeters).toBeGreaterThan(0);
    expect(CAMERA_DEAD_ZONE.zoom).toBeGreaterThan(0);
    expect(CAMERA_DEAD_ZONE.pitch).toBeGreaterThan(0);
    expect(CAMERA_DEAD_ZONE.bearing).toBeGreaterThan(0);
    expect(CAMERA_COALESCE_MS).toBeGreaterThan(0);
  });
});
