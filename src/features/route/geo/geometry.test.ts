/**
 * Tests de la géométrie pure : distances point→segment/polyligne,
 * bounding box, validation de coordonnées. Tout est déterministe.
 */

import {
  boundingBoxContains,
  boundingBoxOfPolyline,
  distanceToPolylineMeters,
  expandBoundingBox,
  isValidGeoPoint,
  METERS_PER_DEGREE_LAT,
  pointToSegmentDistanceMeters,
} from './geometry';

// Route de test horizontale (latitude constante) : l'écart plein nord est
// exactement perpendiculaire → distance attendue exacte, sans approximation.
const FLAT_ROUTE = [
  { latitude: 43.61, longitude: 3.87 },
  { latitude: 43.61, longitude: 3.875 },
  { latitude: 43.61, longitude: 3.88 },
];

function northOf(meters: number) {
  return { latitude: 43.61 + meters / METERS_PER_DEGREE_LAT, longitude: 3.8745 };
}

describe('isValidGeoPoint', () => {
  it('accepte une coordonnée France réaliste', () => {
    expect(isValidGeoPoint({ latitude: 43.6108, longitude: 3.8767 })).toBe(true);
  });

  it('rejette NaN, hors bornes et la sentinelle {0,0}', () => {
    expect(isValidGeoPoint({ latitude: Number.NaN, longitude: 3.87 })).toBe(false);
    expect(isValidGeoPoint({ latitude: 91, longitude: 3.87 })).toBe(false);
    expect(isValidGeoPoint({ latitude: 43.6, longitude: 181 })).toBe(false);
    expect(isValidGeoPoint({ latitude: 0, longitude: 0 })).toBe(false);
  });
});

describe('pointToSegmentDistanceMeters', () => {
  it('vaut 0 pour un point sur le segment', () => {
    const [a, , c] = FLAT_ROUTE;
    expect(pointToSegmentDistanceMeters({ latitude: 43.61, longitude: 3.872 }, a, c)).toBeCloseTo(0, 6);
  });

  it('mesure un écart perpendiculaire exact', () => {
    const [a, , c] = FLAT_ROUTE;
    expect(pointToSegmentDistanceMeters(northOf(150), a, c)).toBeCloseTo(150, 6);
  });

  it('projette au-delà des extrémités sur le sommet le plus proche', () => {
    const [a, b] = FLAT_ROUTE;
    // Point à l'ouest du départ : distance = distance au point A.
    const west = { latitude: 43.61, longitude: 3.8690 };
    const direct = pointToSegmentDistanceMeters(west, a, a);
    expect(pointToSegmentDistanceMeters(west, a, b)).toBeCloseTo(direct, 6);
  });

  it('gère un segment dégénéré (deux fois le même point)', () => {
    const a = { latitude: 43.61, longitude: 3.87 };
    expect(pointToSegmentDistanceMeters(northOf(80), a, a)).toBeGreaterThan(0);
  });
});

describe('distanceToPolylineMeters', () => {
  it('prend le minimum sur plusieurs segments', () => {
    expect(distanceToPolylineMeters(northOf(100), FLAT_ROUTE)).toBeCloseTo(100, 6);
  });

  it('polyligne vide → +Infinity (aucune distance inventée)', () => {
    expect(distanceToPolylineMeters(northOf(10), [])).toBe(Number.POSITIVE_INFINITY);
  });

  it('polyligne à un seul point → distance à ce point', () => {
    const single = [{ latitude: 43.61, longitude: 3.8745 }];
    expect(distanceToPolylineMeters(northOf(120), single)).toBeCloseTo(120, 4);
  });
});

describe('bounding box', () => {
  it('borne la polyligne et refuse la polyligne vide', () => {
    const bbox = boundingBoxOfPolyline(FLAT_ROUTE);
    expect(bbox).toEqual({
      minLatitude: 43.61,
      maxLatitude: 43.61,
      minLongitude: 3.87,
      maxLongitude: 3.88,
    });
    expect(boundingBoxOfPolyline([])).toBeNull();
  });

  it("l'extension en mètres est conservatrice : un point à la limite reste dedans", () => {
    const bbox = boundingBoxOfPolyline(FLAT_ROUTE);
    if (bbox === null) throw new Error('bbox attendue');
    const expanded = expandBoundingBox(bbox, 200);
    expect(boundingBoxContains(expanded, northOf(200))).toBe(true);
    expect(boundingBoxContains(expanded, northOf(400))).toBe(false);
  });
});
