import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl';

import { colors } from '@/design/tokens/colors';
import { cryptogramColor, cryptogramDataUri, type CryptogramId } from '@/features/merchants/cryptograms';

type Mapbox = typeof import('mapbox-gl')['default'];

export interface VisibleMerchant {
  id: string;
  lng: number;
  lat: number;
  photo: string;
  cryptogramId: CryptogramId;
}

const POOL_MAX = 80;
const CRYPTO_SIZE = 18;

function styleBase(el: HTMLDivElement, photo: string) {
  el.style.position = 'relative';
  el.style.width = '40px';
  el.style.height = '40px';
  el.style.borderRadius = '20px';
  el.style.borderStyle = 'solid';
  el.style.cursor = 'pointer';
  el.style.boxShadow = '0 2px 6px rgba(23,32,26,0.35)';
  el.style.backgroundSize = 'cover';
  el.style.backgroundPosition = 'center';
  el.style.transition = 'transform 0.12s ease, border-color 0.12s ease';
  if (photo) {
    el.style.backgroundImage = `url("${photo}")`;
    el.style.backgroundColor = colors.surface;
  } else {
    el.style.backgroundColor = colors.primary;
  }
}

/** Contour = couleur de la catégorie au repos ; primary quand sélectionné. */
function styleSelected(el: HTMLDivElement, active: boolean, ringColor: string) {
  el.style.borderColor = active ? colors.primary : ringColor;
  el.style.borderWidth = '3px';
  el.style.transform = active ? 'scale(1.25)' : 'scale(1)';
  el.style.zIndex = active ? '3' : '1';
}

/** Petit cryptogramme officiel superposé en haut-droite de la pastille photo. */
function createCryptogramBadge(id: CryptogramId): HTMLDivElement {
  const badge = document.createElement('div');
  badge.style.position = 'absolute';
  badge.style.top = '-4px';
  badge.style.right = '-4px';
  badge.style.width = `${CRYPTO_SIZE}px`;
  badge.style.height = `${CRYPTO_SIZE}px`;
  badge.style.backgroundImage = `url("${cryptogramDataUri(id, CRYPTO_SIZE)}")`;
  badge.style.backgroundSize = 'contain';
  badge.style.backgroundRepeat = 'no-repeat';
  badge.style.backgroundPosition = 'center';
  badge.style.pointerEvents = 'none';
  badge.style.filter = 'drop-shadow(0 1px 1px rgba(23,32,26,0.35))';
  return badge;
}

/**
 * PhotoMarkerLayer — gère un POOL BORNÉ de marqueurs photo HTML pour les seuls
 * commerces non clusterisés visibles. Le DOM ne contient jamais des milliers de
 * marqueurs : Mapbox GL porte tout le reste (clusters). Réutilise/retire à la volée.
 */
export class PhotoMarkerLayer {
  private markers = new Map<string, { marker: MapboxMarker; el: HTMLDivElement; ringColor: string }>();
  private selectedId: string | null = null;

  constructor(
    private readonly mapboxgl: Mapbox,
    private readonly map: MapboxMap,
    private readonly onSelect: (id: string) => void,
  ) {}

  setSelected(id: string | null): void {
    this.selectedId = id;
    for (const [markerId, entry] of this.markers) {
      styleSelected(entry.el, markerId === id, entry.ringColor);
    }
  }

  /** Synchronise le pool sur les commerces visibles (ajoute/retire/recycle). */
  sync(points: VisibleMerchant[]): void {
    const capped = points.slice(0, POOL_MAX);
    const next = new Set(capped.map((p) => p.id));

    for (const [id, entry] of this.markers) {
      if (!next.has(id)) {
        entry.marker.remove();
        this.markers.delete(id);
      }
    }

    for (const p of capped) {
      if (this.markers.has(p.id)) continue;
      const el = document.createElement('div');
      styleBase(el, p.photo);
      const ringColor = cryptogramColor(p.cryptogramId);
      styleSelected(el, p.id === this.selectedId, ringColor);
      el.appendChild(createCryptogramBadge(p.cryptogramId));
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        this.onSelect(p.id);
      });
      const marker = new this.mapboxgl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(this.map);
      this.markers.set(p.id, { marker, el, ringColor });
    }
  }

  clear(): void {
    for (const entry of this.markers.values()) entry.marker.remove();
    this.markers.clear();
  }
}
