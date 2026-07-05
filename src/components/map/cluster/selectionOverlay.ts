import type { GeoJSONSource, Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl';

type Mapbox = typeof import('mapbox-gl')['default'];
type LngLat = [number, number];

const SRC = 'yootoo-selection';
const RING = 'selection-ring';
const ROUTE = 'selection-route';
const GOLD = '#C9A24B';
const ROUTE_COLOR = '#3E6DB0';
/** Vitesse de marche (m/min) + facteur de détour (le trajet réel > à vol d'oiseau). */
const WALK_M_PER_MIN = 83;
const DETOUR = 1.3;

/** Distance (m) entre deux [lng,lat] — Haversine. */
function haversineMeters(a: LngLat, b: LngLat): number {
  const R = 6_371_000;
  const r = (d: number): number => (d * Math.PI) / 180;
  const dLat = r(b[1] - a[1]);
  const dLng = r(b[0] - a[0]);
  const la1 = r(a[1]);
  const la2 = r(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * SelectionOverlay — mise en avant PREMIUM du commerce sélectionné (le héros) :
 *  - anneau OR posé au sol (pitch-alignment map) → ancrage visuel fort ;
 *  - trajet piéton (ligne pointillée douce) depuis la position utilisateur ;
 *  - pastille « X min · à pied » (estimation à vol d'oiseau + détour), sans appel réseau.
 * Rendu uniquement (aucune donnée/ranking). Disparaît à la désélection.
 */
export class SelectionOverlay {
  private timeMarker: MapboxMarker | null = null;

  constructor(
    private readonly mapboxgl: Mapbox,
    private readonly map: MapboxMap,
  ) {}

  /** Installe source + couches (idempotent). Appelé après les couches clusters (ordre = au-dessus). */
  install(): void {
    if (this.map.getSource(SRC)) return;
    this.map.addSource(SRC, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    } as unknown as Parameters<MapboxMap['addSource']>[1]);

    // Trajet piéton — ligne douce pointillée (sous l'anneau).
    this.map.addLayer({
      id: ROUTE,
      type: 'line',
      source: SRC,
      filter: ['==', ['get', 'kind'], 'route'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ROUTE_COLOR,
        'line-width': 3,
        'line-opacity': 0.75,
        'line-dasharray': [1.4, 1.6],
      },
    } as unknown as Parameters<MapboxMap['addLayer']>[0]);

    // Anneau OR au sol — posé sur le sol (s'incline avec le pitch).
    this.map.addLayer({
      id: RING,
      type: 'circle',
      source: SRC,
      filter: ['==', ['get', 'kind'], 'ring'],
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 15, 14, 18, 26],
        'circle-color': 'rgba(201,162,75,0.12)',
        'circle-stroke-color': GOLD,
        'circle-stroke-width': 3,
        'circle-stroke-opacity': 0.9,
        'circle-pitch-alignment': 'map',
      },
    } as unknown as Parameters<MapboxMap['addLayer']>[0]);
  }

  /** Met à jour l'overlay pour le commerce sélectionné (et le trajet depuis l'utilisateur). */
  update(selected: LngLat | null, user: LngLat | null): void {
    const src = this.map.getSource(SRC) as GeoJSONSource | undefined;
    if (!src) return;
    if (!selected) {
      src.setData({ type: 'FeatureCollection', features: [] } as unknown as Parameters<GeoJSONSource['setData']>[0]);
      this.clearTime();
      return;
    }
    const features: unknown[] = [
      { type: 'Feature', properties: { kind: 'ring' }, geometry: { type: 'Point', coordinates: selected } },
    ];
    if (user) {
      features.push({
        type: 'Feature',
        properties: { kind: 'route' },
        geometry: { type: 'LineString', coordinates: [user, selected] },
      });
      const minutes = Math.max(1, Math.round((haversineMeters(user, selected) * DETOUR) / WALK_M_PER_MIN));
      this.setTime([(user[0] + selected[0]) / 2, (user[1] + selected[1]) / 2], minutes);
    } else {
      this.clearTime();
    }
    src.setData({ type: 'FeatureCollection', features } as unknown as Parameters<GeoJSONSource['setData']>[0]);
  }

  private setTime(mid: LngLat, minutes: number): void {
    if (!this.timeMarker) {
      const el = document.createElement('div');
      Object.assign(el.style, {
        background: 'rgba(23,32,26,0.82)',
        color: '#FFFFFF',
        font: '600 12px ui-sans-serif, system-ui, sans-serif',
        padding: '4px 9px',
        borderRadius: '999px',
        whiteSpace: 'nowrap',
        boxShadow: '0 2px 6px rgba(23,32,26,0.35)',
        pointerEvents: 'none',
      });
      this.timeMarker = new this.mapboxgl.Marker({ element: el }).setLngLat(mid).addTo(this.map);
    }
    this.timeMarker.getElement().textContent = `${minutes} min · à pied`;
    this.timeMarker.setLngLat(mid);
  }

  private clearTime(): void {
    this.timeMarker?.remove();
    this.timeMarker = null;
  }

  destroy(): void {
    this.clearTime();
    for (const layer of [RING, ROUTE]) {
      if (this.map.getLayer(layer)) this.map.removeLayer(layer);
    }
    if (this.map.getSource(SRC)) this.map.removeSource(SRC);
  }
}
