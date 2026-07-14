import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { getMapConfig } from '@/features/map/config';

import type { MapItem, StationCluster, StationWithRoutes } from '../mapModel';

/**
 * Carte Bus & Tram — WEB (mapbox-gl, STYLE YOOTOO GELÉ via getMapConfig, jamais surchargé).
 * Marqueurs DOM : différenciation Bus/Tramway par FORME + LETTRE (jamais la couleur seule),
 * couleurs officielles des lignes en pastilles, sélection agrandie, cibles tactiles 44 px.
 * Aucun commerce ici — uniquement les stations fournies par le modèle (déjà fenêtrées).
 */

export interface TransitMapFocus { latitude: number; longitude: number; zoom?: number; token: number }

export interface TransitMapProps {
  items: MapItem<StationWithRoutes>[];
  selectedId: number | null;
  onSelectStation: (id: number) => void;
  onSelectCluster: (cluster: StationCluster) => void;
  onRegionChange: (center: { latitude: number; longitude: number }, zoom: number) => void;
  userLocation: { latitude: number; longitude: number } | null;
  focus: TransitMapFocus | null;
}

const KIND_GLYPH: Record<string, string> = { tram: 'T', bus: 'B', mixte: 'T·B', inconnu: '•' };

function markerHtml(station: StationWithRoutes, selected: boolean): string {
  const kind = station.routes.some((r) => r.routeType === 0) && station.routes.some((r) => r.routeType === 3)
    ? 'mixte' : station.routes.some((r) => r.routeType === 0) ? 'tram' : station.routes.some((r) => r.routeType === 3) ? 'bus' : 'inconnu';
  const radius = kind === 'tram' ? '7px' : '50%'; // FORME : carré arrondi = tram, rond = bus
  const chips = station.routes.slice(0, 3).map((r) =>
    `<span style="background:#${r.color ?? '5B6770'};color:#fff;border-radius:4px;padding:0 3px;font-size:9px;font-weight:700;line-height:12px">${r.shortName ?? ''}</span>`).join('');
  const more = station.routes.length > 3 ? `<span style="font-size:9px;color:#1F2937">+${station.routes.length - 3}</span>` : '';
  const scale = selected ? 1.28 : 1;
  return `
  <div role="button" aria-label="Station ${station.name.replace(/"/g, '&quot;')}" style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer">
    <div style="transform:scale(${scale});transition:transform .15s;display:flex;flex-direction:column;align-items:center;gap:1px;${selected ? 'filter:drop-shadow(0 3px 6px rgba(0,0,0,.35));' : ''}">
      <div style="min-width:22px;height:22px;padding:0 3px;background:${selected ? '#1F2937' : '#FFFFFF'};color:${selected ? '#fff' : '#1F2937'};border:2px solid #1F2937;border-radius:${radius};display:flex;align-items:center;justify-content:center;font:700 10px system-ui">${KIND_GLYPH[kind]}</div>
      <div style="display:flex;gap:2px;background:rgba(255,255,255,.92);border-radius:5px;padding:1px 2px">${chips}${more}</div>
    </div>
  </div>`;
}

export function TransitMap({ items, selectedId, onSelectStation, onSelectCluster, onRegionChange, userLocation, focus }: TransitMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import('mapbox-gl').Map | null>(null);
  const markersRef = useRef<import('mapbox-gl').Marker[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'no-token'>('loading');
  const cbRef = useRef({ onSelectStation, onSelectCluster, onRegionChange });
  useEffect(() => { cbRef.current = { onSelectStation, onSelectCluster, onRegionChange }; });

  // Initialisation unique — style GELÉ, aucun paramètre graphique modifié.
  useEffect(() => {
    const { token, mapStyle, defaultRegion } = getMapConfig();
    if (!token) { queueMicrotask(() => setStatus('no-token')); return; }
    let disposed = false;
    void (async () => {
      try {
        const mapboxgl = (await import('mapbox-gl')).default;
        if (disposed || !containerRef.current) return;
        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: mapStyle as string,
          center: [focus?.longitude ?? defaultRegion.center.longitude, focus?.latitude ?? defaultRegion.center.latitude],
          zoom: focus?.zoom ?? 15.2,
          pitch: 40,
          attributionControl: false,
        });
        map.on('load', () => { if (!disposed) setStatus('ready'); });
        map.on('error', () => { if (!disposed) setStatus((s) => (s === 'ready' ? s : 'error')); });
        map.on('moveend', () => {
          const c = map.getCenter();
          cbRef.current.onRegionChange({ latitude: c.lat, longitude: c.lng }, map.getZoom());
        });
        mapRef.current = map;
      } catch {
        if (!disposed) setStatus('error');
      }
    })();
    return () => { disposed = true; mapRef.current?.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recentrage piloté (sélection, bouton position, retour) — easeTo doux.
  useEffect(() => {
    if (!focus || !mapRef.current || status !== 'ready') return;
    mapRef.current.easeTo({ center: [focus.longitude, focus.latitude], zoom: focus.zoom ?? mapRef.current.getZoom(), duration: 450 });
  }, [focus, status]);

  // Marqueurs : reconstruits à chaque changement d'items/sélection (≤ ~80 par conception).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== 'ready') return;
    void (async () => {
      const mapboxgl = (await import('mapbox-gl')).default;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      if (userLocation) {
        const dot = document.createElement('div');
        dot.setAttribute('aria-label', 'Votre position');
        dot.style.cssText = 'width:16px;height:16px;border-radius:50%;background:#2563EB;border:3px solid #fff;box-shadow:0 0 0 2px rgba(37,99,235,.35)';
        markersRef.current.push(new mapboxgl.Marker({ element: dot }).setLngLat([userLocation.longitude, userLocation.latitude]).addTo(map));
      }
      for (const item of items) {
        const el = document.createElement('div');
        if (item.type === 'station') {
          el.innerHTML = markerHtml(item.station, item.station.id === selectedId);
          el.addEventListener('click', (e) => { e.stopPropagation(); cbRef.current.onSelectStation(item.station.id); });
          markersRef.current.push(new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat([item.station.longitude, item.station.latitude]).addTo(map));
        } else {
          const c = item.cluster;
          el.innerHTML = `<div role="button" aria-label="${c.count} stations, toucher pour zoomer" style="width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer"><div style="min-width:30px;height:30px;padding:0 4px;border-radius:50%;background:#1F2937;color:#fff;border:2px solid #fff;display:flex;align-items:center;justify-content:center;font:700 12px system-ui;box-shadow:0 2px 5px rgba(0,0,0,.3)">${c.count}</div></div>`;
          el.addEventListener('click', (e) => { e.stopPropagation(); cbRef.current.onSelectCluster(c); });
          markersRef.current.push(new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat([c.longitude, c.latitude]).addTo(map));
        }
      }
    })();
  }, [items, selectedId, userLocation, status]);

  if (status === 'no-token' || status === 'error') {
    return (
      <View style={styles.fallback}>
        <YText variant="caption" color="muted">
          {status === 'no-token' ? 'Carte indisponible (token Mapbox absent) — la liste ci-dessous reste utilisable.' : 'Carte momentanément indisponible — la liste ci-dessous reste utilisable.'}
        </YText>
      </View>
    );
  }
  return <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} aria-label="Carte des arrêts Bus et Tramway" />;
}

const styles = StyleSheet.create({
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
