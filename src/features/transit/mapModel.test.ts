/// <reference types="jest" />
import { CLUSTER_MAX_ZOOM, clusterForZoom, filterByMode, resolveSelected, stationKind, visibleStations } from './mapModel';
import type { StationWithRoutes } from './mapModel';
import type { TransitRoute } from './types';

const route = (routeId: string, routeType: number): TransitRoute =>
  ({ id: Number(routeId.replace(/\D/g, '') || 1), routeId, shortName: routeId, longName: null, routeType, color: 'FF6600' });
const station = (id: number, name: string, lat: number, lng: number, routes: TransitRoute[]): StationWithRoutes =>
  ({ id, name, latitude: lat, longitude: lng, stopIds: [String(id)], stopPks: [id], wheelchairBoarding: null, routes });

const COMEDIE = { latitude: 43.6086, longitude: 3.8797 };
const T1 = route('T1', 0), T2 = route('T2', 0), B8 = route('B8', 3), B11 = route('B11', 3);

describe('sélecteur Tous / Tramway / Bus (filterByMode)', () => {
  const stations = [
    station(1, 'Comédie', 43.6086, 3.8797, [T1, T2]),          // tram pur
    station(2, 'Place Carnot', 43.607, 3.881, [T2, B8, B11]),  // MIXTE
    station(3, 'Pont de Sète', 43.604, 3.874, [B8]),           // bus pur
  ];

  it('« Tous » (défaut) : toutes les stations, lignes intactes', () => {
    const out = filterByMode(stations, 'tous');
    expect(out).toHaveLength(3);
    expect(out[1].routes).toHaveLength(3);
  });

  it('« Tramway » : stations tram uniquement — la mixte ne montre QUE ses trams', () => {
    const out = filterByMode(stations, 'tram');
    expect(out.map((s) => s.name)).toEqual(['Comédie', 'Place Carnot']);
    expect(out[1].routes.map((r) => r.routeId)).toEqual(['T2']); // B8/B11 masquées
  });

  it('« Bus » : stations bus uniquement — la mixte ne montre QUE ses bus', () => {
    const out = filterByMode(stations, 'bus');
    expect(out.map((s) => s.name)).toEqual(['Place Carnot', 'Pont de Sète']);
    expect(out[0].routes.map((r) => r.routeId)).toEqual(['B8', 'B11']); // T2 masquée
  });

  it('stationKind : tram / bus / mixte', () => {
    expect(stationKind([T1])).toBe('tram');
    expect(stationKind([B8])).toBe('bus');
    expect(stationKind([T1, B8])).toBe('mixte');
  });
});

describe('fenêtrage par viewport (visibleStations)', () => {
  it('ne rend jamais tout le référentiel : plafond des plus proches du centre', () => {
    const many = Array.from({ length: 300 }, (_, i) => station(i, 'S' + i, 43.6 + (i % 20) * 0.001, 3.87 + Math.floor(i / 20) * 0.001, [T1]));
    const out = visibleStations(many, COMEDIE, 15, 80);
    expect(out.length).toBeLessThanOrEqual(80);
  });

  it('exclut les stations hors secteur (Nîmes invisible depuis la Comédie au zoom 15)', () => {
    const out = visibleStations([
      station(1, 'Comédie', 43.6086, 3.8797, [T1]),
      station(2, 'Nîmes Centre', 43.8367, 4.36, [T1]),
    ], COMEDIE, 15, 80);
    expect(out.map((s) => s.name)).toEqual(['Comédie']);
  });
});

describe('regroupement intelligent (clusterForZoom)', () => {
  const dense = Array.from({ length: 30 }, (_, i) => station(i, 'S' + i, 43.6086 + (i % 6) * 0.0004, 3.8797 + Math.floor(i / 6) * 0.0004, [T1]));

  it('zoom serré : stations individuelles (aucun cluster)', () => {
    const items = clusterForZoom(dense, CLUSTER_MAX_ZOOM + 0.1);
    expect(items.every((x) => x.type === 'station')).toBe(true);
  });

  it('zoom large : la grappe dense devient peu de clusters comptés', () => {
    const items = clusterForZoom(dense, 12);
    const clusters = items.filter((x) => x.type === 'cluster');
    expect(items.length).toBeLessThan(dense.length / 2);
    expect(clusters.reduce((a, c) => a + (c.type === 'cluster' ? c.cluster.count : 0), 0)
      + items.filter((x) => x.type === 'station').length).toBe(30); // rien de perdu
  });
});

describe('BUG horaires disparus — resolveSelected (sélection résiliente aux filtres)', () => {
  const comedie = station(1, 'Comédie', 43.6086, 3.8797, [T1, T2]);          // tram pur
  const carnot = station(2, 'Place Carnot', 43.607, 3.881, [T2, B8, B11]);   // mixte
  const all = [comedie, carnot];

  it('changer de ligne/mode ne tue JAMAIS la sélection (Comédie reste résolue en mode Bus)', () => {
    const r = resolveSelected(all, 1, 'bus');
    expect(r).not.toBeNull();
    expect(r!.station.name).toBe('Comédie');
    expect(r!.servesMode).toBe(false); // signalé explicitement, jamais silencieux
  });

  it('station mixte : en mode Tram seules ses lignes tram restent, horaires filtrables', () => {
    const r = resolveSelected(all, 2, 'tram')!;
    expect(r.servesMode).toBe(true);
    expect(r.routesForMode.map((x) => x.routeId)).toEqual(['T2']);
  });

  it('changements successifs Tous→Tram→Bus→Tous : la sélection survit à chaque étape', () => {
    for (const mode of ['tous', 'tram', 'bus', 'tous'] as const) {
      const r = resolveSelected(all, 2, mode);
      expect(r?.station.id).toBe(2);
      expect(r?.servesMode).toBe(true); // mixte : dessert tous les modes
    }
  });

  it('Comédie ligne 2 : chaque direction garde ses départs (les routeIds du mode couvrent T2)', () => {
    const r = resolveSelected(all, 1, 'tram')!;
    const modeRouteIds = new Set(r.routesForMode.map((x) => x.routeId));
    // Deux directions de la ligne T2 : toutes deux conservées par le filtre de mode.
    const groupes = [{ routeId: 'T2', headsign: 'Jacou' }, { routeId: 'T2', headsign: 'St-Jean' }, { routeId: 'B8', headsign: 'X' }];
    expect(groupes.filter((g) => modeRouteIds.has(g.routeId))).toHaveLength(2);
  });
});
