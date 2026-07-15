/**
 * Tests du corridor : construction validée (routes vides/invalides/à un
 * point), limite exacte incluse, préfiltre bbox, largeurs par mode.
 */

import { createRouteEngineConfig } from '../config';
import { SIMULATED_ROUTE_COMEDIE_ARCEAUX } from '../fixtures';
import { offsetNorthMeters, POINT_ON_ROUTE } from '../fixtures/corridorFixtures';
import type { TransportMode } from '../domain/types';
import { buildCorridor, corridorForRoute, isInCorridor } from './corridor';
import { METERS_PER_DEGREE_LAT } from './geometry';

const FLAT_POLYLINE = [
  { latitude: 43.61, longitude: 3.87 },
  { latitude: 43.61, longitude: 3.88 },
];

function flatCorridor(widthMeters: number) {
  const result = buildCorridor({ polyline: FLAT_POLYLINE, widthMeters, routeVersion: 1 });
  if (!result.ok) throw new Error('corridor attendu');
  return result.corridor;
}

describe('buildCorridor — validation de la route', () => {
  it('construit un corridor valide avec bbox étendue et compte de segments', () => {
    const corridor = flatCorridor(200);
    expect(corridor.segmentCount).toBe(1);
    expect(corridor.routeVersion).toBe(1);
    expect(corridor.expandedBoundingBox.maxLatitude).toBeGreaterThan(43.61);
  });

  it('rejette route vide, route à un seul point, coordonnées invalides et largeur invalide', () => {
    expect(buildCorridor({ polyline: [], widthMeters: 200, routeVersion: 1 })).toEqual({
      ok: false,
      reason: 'empty_route',
    });
    expect(
      buildCorridor({ polyline: [FLAT_POLYLINE[0]], widthMeters: 200, routeVersion: 1 }),
    ).toEqual({ ok: false, reason: 'single_point_route' });
    expect(
      buildCorridor({
        polyline: [FLAT_POLYLINE[0], { latitude: Number.NaN, longitude: 3.88 }],
        widthMeters: 200,
        routeVersion: 1,
      }),
    ).toEqual({ ok: false, reason: 'invalid_coordinates' });
    expect(buildCorridor({ polyline: FLAT_POLYLINE, widthMeters: 0, routeVersion: 1 })).toEqual({
      ok: false,
      reason: 'invalid_width',
    });
  });
});

describe('isInCorridor — appartenance déterministe', () => {
  const width = 200;
  const corridor = flatCorridor(width);
  const onAxis = { latitude: 43.61, longitude: 3.875 };

  it('inclut un point exactement sur le trajet', () => {
    expect(isInCorridor(corridor, onAxis)).toBe(true);
  });

  it('inclut la limite exacte du corridor (règle : distance ≤ largeur)', () => {
    const atLimit = {
      latitude: 43.61 + width / METERS_PER_DEGREE_LAT,
      longitude: 3.875,
    };
    expect(isInCorridor(corridor, atLimit)).toBe(true);
  });

  it('exclut un point juste à l’extérieur', () => {
    const justOutside = {
      latitude: 43.61 + (width + 5) / METERS_PER_DEGREE_LAT,
      longitude: 3.875,
    };
    expect(isInCorridor(corridor, justOutside)).toBe(false);
  });

  it('exclut très vite un point hors bounding box', () => {
    expect(isInCorridor(corridor, { latitude: 44.5, longitude: 5.0 })).toBe(false);
  });
});

describe('corridorForRoute — trajet simulé et largeurs par mode', () => {
  const config = createRouteEngineConfig();
  const modes: TransportMode[] = ['wheelchair', 'walk', 'bike', 'car'];

  it.each(modes)('mode %s : largeur injectée depuis la config, point sur trajet inclus', (mode) => {
    const width = config.corridorWidthMetersByMode[mode];
    const result = corridorForRoute(SIMULATED_ROUTE_COMEDIE_ARCEAUX, width);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.corridor.widthMeters).toBe(width);
    expect(result.corridor.routeVersion).toBe(SIMULATED_ROUTE_COMEDIE_ARCEAUX.routeVersion);
    expect(isInCorridor(result.corridor, POINT_ON_ROUTE)).toBe(true);
  });

  it('le fauteuil roulant a une largeur propre, distincte de la marche', () => {
    expect(config.corridorWidthMetersByMode.wheelchair).not.toBe(
      config.corridorWidthMetersByMode.walk,
    );
  });

  it('un point dans le corridor marche peut être hors du corridor fauteuil (plus étroit)', () => {
    const walkWidth = config.corridorWidthMetersByMode.walk;
    const wheelchairWidth = config.corridorWidthMetersByMode.wheelchair;
    const between = offsetNorthMeters(POINT_ON_ROUTE, (walkWidth + wheelchairWidth) / 2);
    const walkResult = corridorForRoute(SIMULATED_ROUTE_COMEDIE_ARCEAUX, walkWidth);
    const wheelchairResult = corridorForRoute(SIMULATED_ROUTE_COMEDIE_ARCEAUX, wheelchairWidth);
    if (!walkResult.ok || !wheelchairResult.ok) throw new Error('corridors attendus');
    expect(isInCorridor(walkResult.corridor, between)).toBe(true);
    expect(isInCorridor(wheelchairResult.corridor, between)).toBe(false);
  });
});
