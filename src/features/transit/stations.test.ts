/// <reference types="jest" />
import { groupStopsIntoStations } from './stations';
import type { TransitStop } from './types';

const stop = (id: number, name: string, lat: number, lng: number, over: Partial<TransitStop> = {}): TransitStop =>
  ({ id, stopId: String(id), name, latitude: lat, longitude: lng, wheelchairBoarding: null, locationType: 0, ...over });

describe('groupStopsIntoStations — quais → stations', () => {
  it('fusionne les quais homonymes proches, ignore la parente (0 horaire), garde les 2 quais', () => {
    const stations = groupStopsIntoStations([
      stop(687, 'Comédie', 43.6086, 3.8797, { locationType: 1 }), // parente GTFS
      stop(688, 'Comédie', 43.6086, 3.8796),
      stop(689, 'Comédie', 43.6087, 3.8799),
    ]);
    expect(stations).toHaveLength(1);
    expect(stations[0].stopIds.sort()).toEqual(['688', '689']); // les quais porteurs d'horaires
  });

  it('deux stations homonymes ÉLOIGNÉES restent distinctes (jamais de fusion à distance)', () => {
    const stations = groupStopsIntoStations([
      stop(1, 'Mairie', 43.60, 3.88),
      stop(2, 'Mairie', 43.70, 3.95), // ~13 km
    ]);
    expect(stations).toHaveLength(2);
  });

  it('PMR agrégée : 1 si au moins un quai accessible ; 2 si tous non ; null sinon', () => {
    const [a] = groupStopsIntoStations([stop(1, 'A', 43.6, 3.88, { wheelchairBoarding: 2 }), stop(2, 'A', 43.6, 3.8801, { wheelchairBoarding: 1 })]);
    expect(a.wheelchairBoarding).toBe(1);
    const [b] = groupStopsIntoStations([stop(3, 'B', 43.61, 3.88, { wheelchairBoarding: 2 }), stop(4, 'B', 43.61, 3.8801, { wheelchairBoarding: 2 })]);
    expect(b.wheelchairBoarding).toBe(2);
  });

  it('une parente isolée sans quai homonyme est conservée (honnête, jamais un doublon)', () => {
    const stations = groupStopsIntoStations([stop(9, 'Dépôt', 43.62, 3.9, { locationType: 1 })]);
    expect(stations).toHaveLength(1);
    expect(stations[0].name).toBe('Dépôt');
  });
});
