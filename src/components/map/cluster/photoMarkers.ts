import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl';

import { colors } from '@/design/tokens/colors';
import { cryptogramAssetUri } from '@/features/merchants/cryptogramAssets';
import { cryptogramColor, type CryptogramId } from '@/features/merchants/cryptograms';

type Mapbox = typeof import('mapbox-gl')['default'];

export interface VisibleMerchant {
  id: string;
  lng: number;
  lat: number;
  photo: string;
  cryptogramId: CryptogramId;
  /** Note (0–5) — utilisée pour prioriser les marqueurs photo (densité). */
  rating: number;
  /** Producteur local (0 | 1) — priorité d'affichage. */
  producer: number;
}

const POOL_MAX = 140;
const CRYPTO_SIZE = 18;

function styleBase(el: HTMLDivElement, photo: string) {
  // `absolute` (jamais `relative`) : Mapbox positionne le marqueur UNIQUEMENT via `transform`.
  // En `relative`, chaque marqueur occuperait 40px dans le flux du canvas-container → empilement
  // vertical (N×40px) qui pousse la majorité des marqueurs hors de l'écran.
  el.style.position = 'absolute';
  el.style.top = '0';
  el.style.left = '0';
  el.style.width = '40px';
  el.style.height = '40px';
  el.style.borderRadius = '20px';
  el.style.borderStyle = 'solid';
  el.style.cursor = 'pointer';
  el.style.boxShadow = '0 2px 6px rgba(23,32,26,0.35)';
  el.style.backgroundSize = 'cover';
  el.style.backgroundPosition = 'center';
  // Pas de transition sur `transform` : Mapbox y écrit la position à chaque frame → sinon lag/traînée.
  el.style.transition = 'border-color 0.12s ease, box-shadow 0.12s ease, opacity 0.2s ease';
  if (photo) {
    el.style.backgroundImage = `url("${photo}")`;
    el.style.backgroundColor = colors.surface;
  } else {
    el.style.backgroundColor = colors.primary;
  }
}

/** Contour = couleur de la catégorie au repos ; primary + halo quand sélectionné. */
function styleSelected(el: HTMLDivElement, active: boolean, ringColor: string) {
  // NE JAMAIS écrire `el.style.transform` : Mapbox y stocke la position du marqueur. La mise en
  // avant passe UNIQUEMENT par bordure + halo (box-shadow) + z-index (aucun conflit de position).
  el.style.borderColor = active ? colors.primary : ringColor;
  el.style.borderWidth = active ? '4px' : '3px';
  // Sélection : anneau blanc + halo primary + ombre portée → nettement au-dessus des autres.
  el.style.boxShadow = active
    ? `0 0 0 3px #FFFFFF, 0 0 0 6px ${colors.primary}, 0 6px 16px rgba(23,32,26,0.5)`
    : '0 2px 6px rgba(23,32,26,0.35)';
  // z-index élevé et sans ambiguïté : le marqueur sélectionné passe devant tous les autres.
  el.style.zIndex = active ? '6' : '1';
}

/** Petit cryptogramme officiel superposé en haut-droite de la pastille photo. */
function createCryptogramBadge(id: CryptogramId): HTMLDivElement {
  const badge = document.createElement('div');
  badge.style.position = 'absolute';
  badge.style.top = '-4px';
  badge.style.right = '-4px';
  badge.style.width = `${CRYPTO_SIZE}px`;
  badge.style.height = `${CRYPTO_SIZE}px`;
  badge.style.backgroundImage = `url("${cryptogramAssetUri(id)}")`;
  badge.style.backgroundSize = 'contain';
  badge.style.backgroundRepeat = 'no-repeat';
  badge.style.backgroundPosition = 'center';
  badge.style.pointerEvents = 'none';
  badge.style.filter = 'drop-shadow(0 1px 1px rgba(23,32,26,0.35))';
  // Fondu doux quand le cryptogramme apparaît/disparaît selon le zoom (aucun flicker).
  badge.style.transition = 'opacity 0.2s ease';
  return badge;
}

/**
 * PhotoMarkerLayer — gère un POOL BORNÉ de marqueurs photo HTML pour les seuls
 * commerces non clusterisés visibles. Le DOM ne contient jamais des milliers de
 * marqueurs : Mapbox GL porte tout le reste (clusters). Réutilise/retire à la volée.
 */
export class PhotoMarkerLayer {
  private markers = new Map<
    string,
    { marker: MapboxMarker; el: HTMLDivElement; ringColor: string; badge: HTMLDivElement }
  >();
  private selectedId: string | null = null;
  private cryptogramVisible = true;
  /** Plafond de marqueurs photo simultanés (exposé pour le debug/monitoring). */
  readonly poolMax = POOL_MAX;

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

  /**
   * Affiche/masque en fondu les petits cryptogrammes (piloté par le zoom). À très fort
   * zoom on les efface pour laisser respirer la photo. Idempotent (aucun churn au scroll).
   */
  setCryptogramVisible(visible: boolean): void {
    if (visible === this.cryptogramVisible) return;
    this.cryptogramVisible = visible;
    for (const entry of this.markers.values()) {
      entry.badge.style.opacity = visible ? '1' : '0';
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
      const badge = createCryptogramBadge(p.cryptogramId);
      badge.style.opacity = this.cryptogramVisible ? '1' : '0';
      el.appendChild(badge);
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        this.onSelect(p.id);
      });
      // Fondu d'apparition : évite le « pop » brutal quand un marqueur photo entre au zoom.
      el.style.opacity = '0';
      requestAnimationFrame(() => {
        el.style.opacity = '1';
      });
      const marker = new this.mapboxgl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(this.map);
      this.markers.set(p.id, { marker, el, ringColor, badge });
    }
  }

  clear(): void {
    for (const entry of this.markers.values()) entry.marker.remove();
    this.markers.clear();
  }
}
