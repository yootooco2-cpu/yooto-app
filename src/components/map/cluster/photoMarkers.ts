import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl';

import { colors } from '@/design/tokens/colors';
import {
  MARKER_BADGE_SIZE,
  MARKER_POP,
  type MarkerImportance,
} from '@/design/tokens/mapMarkers';
import { markerVisualModel, type MarkerVisualModel } from '@/features/map';
import { cryptogramAssetUri } from '@/features/merchants/cryptogramAssets';
import type { CryptogramId } from '@/features/merchants/cryptograms';

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
  /** État éditorial intrinsèque → anneau/halo (Design System). */
  state: MarkerImportance;
}

const POOL_MAX = 140;

/** `true` si l'utilisateur a demandé à réduire les animations (accessibilité). */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Cadre du marqueur : la photo est le héros ; anneau + halo + ombre viennent du modèle. */
function createFrame(): HTMLDivElement {
  const el = document.createElement('div');
  // `absolute` (jamais `relative`) : Mapbox positionne le marqueur UNIQUEMENT via `transform`.
  // En `relative`, chaque marqueur occuperait sa taille dans le flux → empilement vertical.
  el.style.position = 'absolute';
  el.style.top = '0';
  el.style.left = '0';
  el.style.borderRadius = '50%';
  el.style.borderStyle = 'solid';
  el.style.boxSizing = 'border-box';
  el.style.cursor = 'pointer';
  // JAMAIS de transition sur `transform` (Mapbox y écrit la position → lag/traînée).
  el.style.transition =
    'border-color 0.12s ease, border-width 0.12s ease, box-shadow 0.12s ease, width 0.12s ease, height 0.12s ease, opacity 0.2s ease';
  return el;
}

/** Élément interne portant la PHOTO (héros) + profondeur. Le pop s'anime ICI (jamais le cadre). */
function createPhoto(photo: string): HTMLDivElement {
  const inner = document.createElement('div');
  inner.className = 'photo';
  inner.style.position = 'absolute';
  inner.style.inset = '0';
  inner.style.borderRadius = '50%';
  inner.style.overflow = 'hidden';
  inner.style.backgroundSize = 'cover';
  inner.style.backgroundPosition = 'center';
  // Profondeur : reflet de lumière discret en haut, ombre douce en bas (cohérent haut-gauche).
  inner.style.boxShadow =
    'inset 0 1px 2px rgba(255,255,255,0.22), inset 0 -2px 3px rgba(23,32,26,0.18)';
  inner.style.pointerEvents = 'none';
  if (photo) {
    inner.style.backgroundImage = `url("${photo}")`;
    inner.style.backgroundColor = colors.surface;
  } else {
    inner.style.backgroundColor = colors.primary;
  }
  return inner;
}

/** Applique un modèle visuel (taille, anneau, halo, ombre, z) — AUCUNE décision ici. */
function applyModel(el: HTMLDivElement, model: MarkerVisualModel): void {
  // NE JAMAIS écrire `el.style.transform` : Mapbox y stocke la position (ADR-002).
  el.style.width = `${model.size}px`;
  el.style.height = `${model.size}px`;
  el.style.borderColor = model.borderColor;
  el.style.borderWidth = `${model.borderWidth}px`;
  el.style.boxShadow = model.boxShadow;
  el.style.zIndex = String(model.zIndex);
}

/** Pop one-shot au clic : scale 100 → 105 → 100 %, ~200 ms, sur l'élément interne uniquement. */
function popOnce(inner: HTMLDivElement): void {
  if (prefersReducedMotion() || typeof inner.animate !== 'function') return;
  inner.animate(
    [{ transform: 'scale(1)' }, { transform: `scale(${MARKER_POP.scale})` }, { transform: 'scale(1)' }],
    { duration: MARKER_POP.durationMs, easing: 'ease-out' },
  );
}

/** Petit cryptogramme officiel superposé en haut-droite de la pastille photo. */
function createCryptogramBadge(id: CryptogramId): HTMLDivElement {
  const badge = document.createElement('div');
  badge.style.position = 'absolute';
  badge.style.top = '-4px';
  badge.style.right = '-4px';
  badge.style.width = `${MARKER_BADGE_SIZE}px`;
  badge.style.height = `${MARKER_BADGE_SIZE}px`;
  badge.style.backgroundImage = `url("${cryptogramAssetUri(id)}")`;
  badge.style.backgroundSize = 'contain';
  badge.style.backgroundRepeat = 'no-repeat';
  badge.style.backgroundPosition = 'center';
  badge.style.pointerEvents = 'none';
  badge.style.filter = 'drop-shadow(0 1px 1px rgba(23,32,26,0.35))';
  badge.style.transition = 'opacity 0.2s ease';
  return badge;
}

interface MarkerEntry {
  marker: MapboxMarker;
  el: HTMLDivElement;
  photo: HTMLDivElement;
  badge: HTMLDivElement;
  cryptogramId: CryptogramId;
  state: MarkerImportance;
}

/**
 * PhotoMarkerLayer — POOL BORNÉ de marqueurs photo HTML pour les seuls commerces non
 * clusterisés visibles. Le DOM ne contient jamais des milliers de marqueurs (Mapbox GL porte
 * le reste via les clusters). Le rendu ne fait qu'APPLIQUER un modèle visuel (`markerVisualModel`).
 */
export class PhotoMarkerLayer {
  private markers = new Map<string, MarkerEntry>();
  private selectedId: string | null = null;
  private cryptogramVisible = true;
  /** Plafond de marqueurs photo simultanés (exposé pour le debug/monitoring). */
  readonly poolMax = POOL_MAX;

  constructor(
    private readonly mapboxgl: Mapbox,
    private readonly map: MapboxMap,
    private readonly onSelect: (id: string) => void,
  ) {}

  private restyle(entry: MarkerEntry, selected: boolean): void {
    applyModel(entry.el, markerVisualModel(entry.state, entry.cryptogramId, { selected }));
  }

  setSelected(id: string | null): void {
    const previous = this.selectedId;
    this.selectedId = id;
    for (const [markerId, entry] of this.markers) {
      this.restyle(entry, markerId === id);
    }
    // Pop one-shot sur le marqueur qui vient d'être sélectionné (feedback, jamais permanent).
    if (id && id !== previous) {
      const entry = this.markers.get(id);
      if (entry) popOnce(entry.photo);
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

    const reduce = prefersReducedMotion();
    for (const p of capped) {
      if (this.markers.has(p.id)) continue;
      const el = createFrame();
      const photo = createPhoto(p.photo);
      el.appendChild(photo);
      const badge = createCryptogramBadge(p.cryptogramId);
      badge.style.opacity = this.cryptogramVisible ? '1' : '0';
      el.appendChild(badge);
      const entry: MarkerEntry = {
        marker: null as unknown as MapboxMarker,
        el,
        photo,
        badge,
        cryptogramId: p.cryptogramId,
        state: p.state,
      };
      this.restyle(entry, p.id === this.selectedId);
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        this.onSelect(p.id);
      });
      // Fondu d'apparition (désactivé si `prefers-reduced-motion`).
      if (reduce) {
        el.style.opacity = '1';
      } else {
        el.style.opacity = '0';
        requestAnimationFrame(() => {
          el.style.opacity = '1';
        });
      }
      entry.marker = new this.mapboxgl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(this.map);
      this.markers.set(p.id, entry);
    }
  }

  clear(): void {
    for (const entry of this.markers.values()) entry.marker.remove();
    this.markers.clear();
  }
}
