import type { GeoJSONSource, Map as MapboxMap, MapMouseEvent, Marker as MapboxMarker } from 'mapbox-gl';

import { colors } from '@/design/tokens/colors';
import { getMapConfig, type MapCoordinate, type MapMarker } from '@/features/map';
import { accuracyToHaloPx } from '@/features/location/mapLocation';
import {
  buildMerchantFeatureCollection,
  isPlausibleCoordinate,
} from '@/features/map/cluster/geojson';
import {
  CLUSTER_COUNT_LAYER,
  CLUSTERS_LAYER,
  clusterCountLayerSpec,
  clusterSourceSpec,
  clustersLayerSpec,
  PHOTO_MARKER_CAP,
  SOURCE_ID,
  UNCLUSTERED_HIT_LAYER,
  unclusteredHitLayerSpec,
  ZOOM_HIDE_CRYPTOGRAMS_CLOSE,
  ZOOM_SHOW_PHOTO_MARKERS,
} from '@/features/map/cluster/layers';

import type { CryptogramId } from '@/features/merchants/cryptograms';

import { PhotoMarkerLayer, type VisibleMerchant } from './photoMarkers';
import { selectPhotoMarkers } from './photoSelection';

type Mapbox = typeof import('mapbox-gl')['default'];

const MAX_BBOX_SPAN_DEG = 2.5;

/**
 * MapClusterController — orchestre le moteur cartographique :
 *  - installe la source GeoJSON clusterisée + les couches (clusters, count, hit) ;
 *  - met à jour les données sans recréer la carte ;
 *  - synchronise un pool borné de marqueurs photo (PhotoMarkerLayer) sur le viewport ;
 *  - gère le clic cluster (zoom progressif) et la sélection.
 */
export class MapClusterController {
  private readonly photoLayer: PhotoMarkerLayer;
  private installed = false;
  private userMarker: MapboxMarker | null = null;
  private selectedId: string | null = null;

  constructor(
    private readonly map: MapboxMap,
    private readonly mapboxgl: Mapbox,
    private readonly onSelect: (id: string) => void,
    /** Neutralise le cadrage automatique (`fit`) — utilisé quand un viewport est restauré,
     *  pour ne PAS écraser la caméra rétablie. N'affecte QUE la caméra (aucun clustering). */
    private readonly suppressFit = false,
  ) {
    this.photoLayer = new PhotoMarkerLayer(mapboxgl, map, onSelect);
  }

  /** Met à jour les données (commerces + position) sans recharger la carte. */
  setData(markers: MapMarker[], userLocation?: MapCoordinate | null, userAccuracy?: number | null): void {
    const fc = buildMerchantFeatureCollection(markers);
    const data = fc as unknown as Parameters<GeoJSONSource['setData']>[0];

    const source = this.map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
    } else {
      this.map.addSource(
        SOURCE_ID,
        clusterSourceSpec(fc) as unknown as Parameters<MapboxMap['addSource']>[1],
      );
      this.installLayers();
    }

    this.setUserLocation(userLocation ?? null, userAccuracy ?? null);
    this.syncPhotoMarkers();
    this.fit(markers, userLocation ?? null);
  }

  setSelected(id: string | null): void {
    this.selectedId = id;
    this.photoLayer.setSelected(id);
    // Re-synchronise pour PROMOUVOIR le commerce sélectionné en marqueur photo (même s'il
    // n'était qu'un pin compact / hors cap) → sélection toujours mise en avant.
    this.syncPhotoMarkers();
  }

  destroy(): void {
    this.map.off('moveend', this.syncPhotoMarkers);
    this.map.off('idle', this.syncPhotoMarkers);
    this.map.off('zoom', this.onZoom);
    this.map.off('click', CLUSTERS_LAYER, this.onClusterClick);
    this.map.off('click', UNCLUSTERED_HIT_LAYER, this.onUnclusteredClick);
    this.photoLayer.clear();
    this.userMarker?.remove();
    this.userMarker = null;
    for (const layer of [CLUSTERS_LAYER, CLUSTER_COUNT_LAYER, UNCLUSTERED_HIT_LAYER]) {
      if (this.map.getLayer(layer)) this.map.removeLayer(layer);
    }
    if (this.map.getSource(SOURCE_ID)) this.map.removeSource(SOURCE_ID);
    this.installed = false;
  }

  private installLayers(): void {
    if (this.installed) return;
    this.map.addLayer(clustersLayerSpec() as unknown as Parameters<MapboxMap['addLayer']>[0]);
    this.map.addLayer(clusterCountLayerSpec() as unknown as Parameters<MapboxMap['addLayer']>[0]);
    this.map.addLayer(unclusteredHitLayerSpec() as unknown as Parameters<MapboxMap['addLayer']>[0]);
    this.map.on('click', CLUSTERS_LAYER, this.onClusterClick);
    this.map.on('click', UNCLUSTERED_HIT_LAYER, this.onUnclusteredClick);
    this.map.on('moveend', this.syncPhotoMarkers);
    this.map.on('idle', this.syncPhotoMarkers);
    this.map.on('zoom', this.onZoom);
    this.installed = true;
  }

  /** Clic sur un cluster → zoom progressif (transition fluide, jamais de saut). */
  private onClusterClick = (e: MapMouseEvent): void => {
    this.map.easeTo({ center: e.lngLat, zoom: Math.min(this.map.getZoom() + 2, 18), duration: 400 });
  };

  /** Clic sur un pin sobre (points non clusterisés, zoom large) → sélection du commerce. */
  private onUnclusteredClick = (e: MapMouseEvent & { features?: Array<{ properties?: { id?: string } | null }> }): void => {
    const id = e.features?.[0]?.properties?.id;
    if (id) this.onSelect(id);
  };

  /**
   * Pilotage du cryptogramme selon le zoom : à très fort zoom (>= ZOOM_HIDE_CRYPTOGRAMS_CLOSE),
   * on l'efface en fondu pour laisser respirer la photo. Idempotent → aucun flicker au zoom.
   */
  private onZoom = (): void => {
    this.photoLayer.setCryptogramVisible(this.map.getZoom() < ZOOM_HIDE_CRYPTOGRAMS_CLOSE);
  };

  /** Recense les commerces non clusterisés visibles → met à jour le pool photo. */
  private syncPhotoMarkers = (): void => {
    // Palier « quartier » : en dessous, aucun marqueur photo (clusters + pins sobres GL
    // uniquement) → carte lisible au loin, aucune surcharge.
    if (this.map.getZoom() < ZOOM_SHOW_PHOTO_MARKERS) {
      this.photoLayer.sync([]);
      return;
    }

    let features;
    try {
      features = this.map.querySourceFeatures(SOURCE_ID, {
        filter: ['!', ['has', 'point_count']],
      } as unknown as Parameters<MapboxMap['querySourceFeatures']>[1]);
    } catch {
      return;
    }

    const seen = new Set<string>();
    const points: VisibleMerchant[] = [];
    for (const f of features) {
      const props = f.properties as
        | { id?: string; photo?: string; cryptogramId?: string; rating?: number; producer?: number }
        | null;
      const id = props?.id;
      if (!id || seen.has(id)) continue;
      const geom = f.geometry;
      if (!geom || geom.type !== 'Point') continue;
      seen.add(id);
      const coords = geom.coordinates as [number, number];
      points.push({
        id,
        lng: coords[0],
        lat: coords[1],
        photo: props?.photo ?? '',
        cryptogramId: (props?.cryptogramId as CryptogramId) ?? 'autres',
        rating: props?.rating ?? 0,
        producer: props?.producer ?? 0,
      });
    }

    // Réduction de densité : seuls les commerces prioritaires (vraie photo, producteur, note)
    // deviennent des marqueurs photo ; les autres restent en pin compact (couche GL) → jamais
    // masqués. Le commerce sélectionné est toujours promu.
    const photoPoints = selectPhotoMarkers(points, {
      cap: PHOTO_MARKER_CAP,
      selectedId: this.selectedId,
    });
    this.photoLayer.sync(photoPoints);
    // Applique l'état de visibilité du cryptogramme aux marqueurs (ap. maj données, sans zoom).
    this.onZoom();
  };

  private setUserLocation(coord: MapCoordinate | null, accuracy?: number | null): void {
    this.userMarker?.remove();
    this.userMarker = null;
    if (!coord || !isPlausibleCoordinate(coord)) return;

    // Halo de précision (translucide) + point net « vous » (couleur marque).
    const halo = accuracyToHaloPx(accuracy);
    const el = document.createElement('div');
    el.style.position = 'relative';
    el.style.width = `${halo}px`;
    el.style.height = `${halo}px`;
    el.style.borderRadius = '50%';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.backgroundColor = 'rgba(31,122,77,0.16)';
    el.style.border = '1px solid rgba(31,122,77,0.30)';

    const dot = document.createElement('div');
    dot.style.width = '16px';
    dot.style.height = '16px';
    dot.style.borderRadius = '8px';
    dot.style.backgroundColor = colors.primary;
    dot.style.border = '3px solid #FFFFFF';
    dot.style.boxShadow = '0 1px 4px rgba(23,32,26,0.45)';
    el.appendChild(dot);

    this.userMarker = new this.mapboxgl.Marker({ element: el })
      .setLngLat([coord.longitude, coord.latitude])
      .addTo(this.map);
  }

  /** Cadrage : bbox des commerces si raisonnable, sinon région YOOTOO / position. */
  private fit(markers: MapMarker[], userLocation: MapCoordinate | null): void {
    // Viewport restauré → on ne recadre jamais (la caméra rétablie fait foi).
    if (this.suppressFit) return;
    const { defaultRegion } = getMapConfig();
    const plottable = markers.filter((m) => isPlausibleCoordinate(m.coordinate));
    const bounds = new this.mapboxgl.LngLatBounds();
    for (const m of plottable) bounds.extend([m.coordinate.longitude, m.coordinate.latitude]);
    if (userLocation && isPlausibleCoordinate(userLocation)) {
      bounds.extend([userLocation.longitude, userLocation.latitude]);
    }

    if (bounds.isEmpty()) {
      this.map.jumpTo({ center: [defaultRegion.center.longitude, defaultRegion.center.latitude], zoom: defaultRegion.zoom });
      return;
    }
    const latSpan = bounds.getNorth() - bounds.getSouth();
    const lngSpan = bounds.getEast() - bounds.getWest();
    if (latSpan > MAX_BBOX_SPAN_DEG || lngSpan > MAX_BBOX_SPAN_DEG) {
      if (userLocation && isPlausibleCoordinate(userLocation)) {
        this.map.jumpTo({ center: [userLocation.longitude, userLocation.latitude], zoom: 12 });
      } else {
        this.map.jumpTo({ center: [defaultRegion.center.longitude, defaultRegion.center.latitude], zoom: defaultRegion.zoom });
      }
    } else {
      this.map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });
    }
  }
}
