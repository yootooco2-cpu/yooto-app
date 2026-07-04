/// <reference types="jest" />
import type { CameraPlan, CameraPose } from '@/features/map/camera';

import {
  MapboxCameraBridge,
  MAPBOX_CAPABILITIES,
  cubicBezierEasing,
  easingFor,
  motionToAnimationOptions,
  parseCubicBezier,
  poseToCameraOptions,
  type MapboxCameraApi,
  type MapboxCameraOptions,
} from './mapboxCameraBridge';

const POSE: CameraPose = { center: { latitude: 43.61, longitude: 3.877 }, zoom: 17, pitch: 45, bearing: 0, padding: 32 };
const easePlan: CameraPlan = {
  pose: POSE,
  motion: { primitive: 'ease', durationMs: 600, easing: 'decel' },
  priority: 'explicit',
  mood: 'focus',
};
const flyPlan: CameraPlan = {
  pose: POSE,
  motion: { primitive: 'fly', durationMs: 1000, fly: { curve: 1.42, speed: 1.2 } },
  priority: 'auto',
  mood: 'discover',
};
const jumpPlan: CameraPlan = {
  pose: { ...POSE, pitch: 0 },
  motion: { primitive: 'jump', durationMs: 0 },
  priority: 'auto',
  mood: 'discover',
};

// ── Mock Mapbox ──────────────────────────────────────────────────────────────────────────────

function mockMap(overrides: Partial<MapboxCameraApi> = {}) {
  const calls = {
    jumpTo: [] as MapboxCameraOptions[],
    easeTo: [] as MapboxCameraOptions[],
    flyTo: [] as MapboxCameraOptions[],
    stop: 0,
  };
  let moveend: (() => void) | null = null;
  const map: MapboxCameraApi & { fireMoveend(): void } = {
    getCenter: () => ({ lng: 3.0, lat: 43.0 }),
    getZoom: () => 12,
    getPitch: () => 10,
    getBearing: () => 0,
    jumpTo: (o) => calls.jumpTo.push(o),
    easeTo: (o) => calls.easeTo.push(o),
    flyTo: (o) => calls.flyTo.push(o),
    stop: () => {
      calls.stop++;
    },
    once: (_type, cb) => {
      moveend = cb;
    },
    fireMoveend: () => {
      const cb = moveend;
      moveend = null;
      cb?.();
    },
    ...overrides,
  };
  return { map, calls };
}

// ── Traductions pures ────────────────────────────────────────────────────────────────────────

describe('poseToCameraOptions (pur)', () => {
  it('mappe la pose vers les options SDK (center = [lng, lat])', () => {
    expect(poseToCameraOptions(POSE)).toEqual({
      center: [3.877, 43.61],
      zoom: 17,
      pitch: 45,
      bearing: 0,
      padding: 32,
    });
  });

  it('omet le padding quand il est absent', () => {
    const { padding, ...noPad } = POSE;
    void padding;
    expect(poseToCameraOptions(noPad).padding).toBeUndefined();
  });
});

describe('easing (pur)', () => {
  it('parse une courbe cubic-bezier', () => {
    expect(parseCubicBezier('cubic-bezier(0.16, 1, 0.3, 1)')).toEqual([0.16, 1, 0.3, 1]);
  });

  it('une fonction d’easing part de 0 et arrive à 1', () => {
    const fn = cubicBezierEasing(0.16, 1, 0.3, 1);
    expect(fn(0)).toBeCloseTo(0, 5);
    expect(fn(1)).toBeCloseTo(1, 5);
  });

  it('decel (ease-out) est en avance sur la linéaire à mi-course', () => {
    expect(easingFor('decel')!(0.5)).toBeGreaterThan(0.5);
  });

  it('easingFor(undefined) → pas de fonction (easing SDK par défaut)', () => {
    expect(easingFor(undefined)).toBeUndefined();
  });
});

describe('motionToAnimationOptions (pur)', () => {
  it('ease → durée + fonction d’easing', () => {
    const o = motionToAnimationOptions(easePlan.motion);
    expect(o.duration).toBe(600);
    expect(typeof o.easing).toBe('function');
    expect(o.curve).toBeUndefined();
  });

  it('fly → durée + courbe + vitesse (aucun easing)', () => {
    const o = motionToAnimationOptions(flyPlan.motion);
    expect(o).toEqual({ duration: 1000, curve: 1.42, speed: 1.2 });
  });
});

// ── Le Bridge (mock SDK) ──────────────────────────────────────────────────────────────────────

describe('MapboxCameraBridge', () => {
  it('expose les capacités Mapbox', () => {
    const { map } = mockMap();
    expect(new MapboxCameraBridge(map).capabilities).toBe(MAPBOX_CAPABILITIES);
  });

  it('getPose lit la pose courante du SDK', () => {
    const { map } = mockMap();
    expect(new MapboxCameraBridge(map).getPose()).toEqual({
      center: { latitude: 43.0, longitude: 3.0 },
      zoom: 12,
      pitch: 10,
      bearing: 0,
    });
  });

  it('jump → jumpTo + onDone synchrone', () => {
    const { map, calls } = mockMap();
    const done = jest.fn();
    new MapboxCameraBridge(map).jump(jumpPlan, done);
    expect(calls.jumpTo).toHaveLength(1);
    expect(calls.jumpTo[0].center).toEqual([3.877, 43.61]);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('ease → easeTo (durée + easing) ; onDone au moveend', () => {
    const { map, calls } = mockMap();
    const done = jest.fn();
    const bridge = new MapboxCameraBridge(map);
    bridge.ease(easePlan, done);
    expect(calls.easeTo).toHaveLength(1);
    expect(calls.easeTo[0].duration).toBe(600);
    expect(done).not.toHaveBeenCalled(); // pas avant la fin
    map.fireMoveend();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('fly → flyTo (courbe + vitesse) ; onDone au moveend', () => {
    const { map, calls } = mockMap();
    const done = jest.fn();
    const bridge = new MapboxCameraBridge(map);
    bridge.fly(flyPlan, done);
    expect(calls.flyTo).toHaveLength(1);
    expect(calls.flyTo[0].curve).toBe(1.42);
    map.fireMoveend();
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('stop → map.stop() et le moveend obsolète n’appelle PLUS onDone', () => {
    const { map, calls } = mockMap();
    const done = jest.fn();
    const bridge = new MapboxCameraBridge(map);
    bridge.ease(easePlan, done);
    bridge.stop();
    expect(calls.stop).toBe(1);
    map.fireMoveend(); // fin fantôme après stop
    expect(done).not.toHaveBeenCalled();
  });

  it('erreur SDK absorbée : n’explose pas et débloque le pipeline (onDone appelé)', () => {
    const { map } = mockMap({
      easeTo: () => {
        throw new Error('sdk boom');
      },
    });
    const done = jest.fn();
    const bridge = new MapboxCameraBridge(map);
    expect(() => bridge.ease(easePlan, done)).not.toThrow();
    expect(done).toHaveBeenCalledTimes(1);
  });
});
