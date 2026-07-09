import type { SectionKey } from '@/design/theme/sections';

/**
 * assets/themes — FONDS D'AMBIANCE RÉUTILISABLES par univers.
 *
 * Plutôt que des photos figées, chaque fond est décrit par une composition de « bokeh »
 * (halos flous) posée sur le dégradé de la section (défini dans `sections.ts`). Ces compositions
 * sont réutilisables sur plusieurs écrans (header, cartes, écran plein) via `<SectionAmbient>`.
 * Coordonnées en fractions (0..1) de la zone de rendu → responsive par construction.
 *
 * Pour brancher un jour de vraies images floutées, déposez-les ici (ex. `accueil.jpg`) et
 * ajoutez un champ `image` — `SectionAmbient` pourra les superposer sans changer les écrans.
 */
export interface AmbientBlob {
  /** Position du centre (fraction de largeur/hauteur). */
  x: number;
  y: number;
  /** Diamètre (fraction de la plus grande dimension). */
  size: number;
  /** Teinte : index dans `SectionTheme.bokeh`. */
  tone: 0 | 1;
  /** Opacité de rendu (0..1). */
  opacity: number;
}

export interface AmbientComposition {
  blobs: AmbientBlob[];
}

/** Composition évoquant l'univers (soleil/collines, dunes, façades, feuillage, minéral). */
export const AMBIENTS: Record<SectionKey, AmbientComposition> = {
  // Lever de soleil : halo chaud en haut à droite + reflet bas gauche.
  accueil: {
    blobs: [
      { x: 0.82, y: 0.12, size: 0.85, tone: 0, opacity: 0.9 },
      { x: 0.15, y: 0.85, size: 0.7, tone: 1, opacity: 0.5 },
      { x: 0.5, y: 0.55, size: 0.5, tone: 0, opacity: 0.35 },
    ],
  },
  // Dunes douces : deux masses basses et larges, très diffuses.
  carte: {
    blobs: [
      { x: 0.25, y: 0.9, size: 0.9, tone: 0, opacity: 0.7 },
      { x: 0.85, y: 0.95, size: 0.8, tone: 1, opacity: 0.45 },
      { x: 0.6, y: 0.2, size: 0.5, tone: 0, opacity: 0.3 },
    ],
  },
  // Façades / lumière chaude : halos verticaux évoquant des arches.
  commerce: {
    blobs: [
      { x: 0.3, y: 0.3, size: 0.75, tone: 0, opacity: 0.7 },
      { x: 0.78, y: 0.7, size: 0.7, tone: 1, opacity: 0.5 },
      { x: 0.5, y: 0.95, size: 0.6, tone: 0, opacity: 0.35 },
    ],
  },
  // Feuillage : lumière traversante en haut, ombres végétales diffuses.
  saison: {
    blobs: [
      { x: 0.7, y: 0.2, size: 0.8, tone: 0, opacity: 0.85 },
      { x: 0.18, y: 0.6, size: 0.7, tone: 1, opacity: 0.45 },
      { x: 0.55, y: 0.9, size: 0.6, tone: 0, opacity: 0.35 },
    ],
  },
  // Bulles d'échange : deux halos ronds proches, ambiance conversation locale.
  chat: {
    blobs: [
      { x: 0.72, y: 0.18, size: 0.8, tone: 0, opacity: 0.8 },
      { x: 0.22, y: 0.72, size: 0.72, tone: 1, opacity: 0.5 },
      { x: 0.55, y: 0.95, size: 0.55, tone: 0, opacity: 0.32 },
    ],
  },
  // Minéral / verre fumé : reflets graphite très discrets.
  profil: {
    blobs: [
      { x: 0.8, y: 0.25, size: 0.7, tone: 0, opacity: 0.5 },
      { x: 0.2, y: 0.8, size: 0.8, tone: 1, opacity: 0.5 },
    ],
  },
};
