import type { MapCoordinate, MapMarker } from '@/features/map';

/** Bornes France métropolitaine — au-delà, coordonnée jugée aberrante. */
const FRANCE_BOUNDS = { minLat: 41, maxLat: 51.6, minLng: -5.6, maxLng: 9.9 };

export function isPlausibleCoordinate(c: MapCoordinate): boolean {
  return (
    c.latitude >= FRANCE_BOUNDS.minLat &&
    c.latitude <= FRANCE_BOUNDS.maxLat &&
    c.longitude >= FRANCE_BOUNDS.minLng &&
    c.longitude <= FRANCE_BOUNDS.maxLng
  );
}

/** Propriétés portées par chaque Feature (valeurs primitives → exploitables en clustering). */
export interface MerchantFeatureProperties {
  id: string;
  name: string;
  category: string;
  cryptogramId: string;
  photo: string;
  rating: number;
  open: number; // 0 | 1
  producer: number; // 0 | 1
}

export interface MerchantPointFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: MerchantFeatureProperties;
}

export interface MerchantFeatureCollection {
  type: 'FeatureCollection';
  features: MerchantPointFeature[];
}

/**
 * MerchantGeoJsonBuilder — convertit les marqueurs en une UNIQUE FeatureCollection
 * GeoJSON (source de vérité pour le clustering Mapbox). Ignore les coordonnées
 * aberrantes. Domaine-agnostique (lit uniquement les champs génériques du marqueur).
 */
export function buildMerchantFeatureCollection(markers: MapMarker[]): MerchantFeatureCollection {
  const features: MerchantPointFeature[] = markers
    .filter((m) => isPlausibleCoordinate(m.coordinate))
    .map((m) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [m.coordinate.longitude, m.coordinate.latitude],
      },
      properties: {
        id: m.id,
        name: m.title ?? '',
        category: m.category ?? '',
        cryptogramId: m.cryptogramId ?? 'autres',
        photo: m.imageUrl ?? '',
        rating: m.rating ?? 0,
        open: m.open ? 1 : 0,
        producer: m.producer ? 1 : 0,
      },
    }));

  return { type: 'FeatureCollection', features };
}
