import { colors } from './colors';

/**
 * Tokens des marqueurs vivants (Cartes Vivantes V2.1) — SOURCE UNIQUE des valeurs visuelles
 * de la carte. Le Design System ne dépend de rien (que des `colors`). Consommé par le Map
 * Engine (`markerVisualModel`) et par le Discovery Engine (type `MarkerImportance`).
 * → docs/map/DESIGN-SYSTEM.md (§4 couleurs, §5 états) · ADR-005.
 *
 * Règle : AUCUNE valeur visuelle de marqueur ne doit être codée en dur ailleurs.
 */

/** Les 4 états d'un marqueur. `selected` est transitoire (géré au rendu, pas éditorial). */
export type MarkerState = 'standard' | 'recommended' | 'exceptional' | 'selected';
/** États INTRINSÈQUES (décidés par le Discovery Engine, hors sélection). */
export type MarkerImportance = Exclude<MarkerState, 'selected'>;

/** Repli neutre premium — jamais un gris « système », une pierre chaude discrète. */
export const NEUTRAL_MARKER_COLOR = '#8A867B';

/**
 * Langage des couleurs — teinte du CADRE (anneau + halo) selon la catégorie. Objectif :
 * reconnaître une catégorie SANS lire (pré-attentif). Ancré sur la charte (§4). Distinct du
 * badge cryptogramme (qui garde l'identité pictogramme). Clé = CryptogramId (string agnostique
 * côté moteur). Total sur les cryptogrammes connus → un marqueur ne retombe jamais par hasard.
 */
export const MAP_COLOR_LANGUAGE: Record<string, string> = {
  producteur: '#7D9068', // vert sauge
  primeur: '#4E8A3C', // vert feuille
  epicerie: '#46703F', // vert potager
  boulangerie: '#C99A3E', // blé doré
  patisserie: '#D8A99B', // rosé pâtisserie
  fromagerie: '#D3A94A', // crème dorée
  cafe: '#5B4636', // espresso
  restaurant: '#C0674A', // terracotta
  marche: '#C65A48', // terracotta marché
  traiteur: '#C07B3C', // ambre traiteur
  caviste: '#7E2E3C', // bordeaux
  boucherie: '#A23A48', // grenat
  poissonnerie: '#2E7DA1', // bleu marée
  fleuriste: '#C06A86', // rose botanique
  artisanat: '#B06B3A', // cuivre
  librairie: '#4C5599', // encre
  culture: '#2F3A63', // bleu nuit
  bienetre: '#8C7BB0', // lavande
  sport: '#7A8450', // olive
  nature: '#3D5A34', // forêt
  mobilite: '#5FB0E0', // ciel
  transports: '#2C4A7A', // bleu ardoise
  cooperative: '#2E8BD6', // bleu coopérative
  nearby: '#5688BC',
  open: '#65851A',
  autres: NEUTRAL_MARKER_COLOR,
};

/** Résout la teinte catégorie d'un marqueur (repli neutre premium si inconnue). */
export function mapColorFor(cryptogramId: string): string {
  return MAP_COLOR_LANGUAGE[cryptogramId] ?? NEUTRAL_MARKER_COLOR;
}

/** Or/champagne de l'état Exceptionnel — précieux, rare, JAMAIS rouge. */
export const EXCEPTIONAL_GOLD = '#C9A24B';
/** Vert YOOTOO de l'état Sélectionné (couleur fixe, la seule). */
export const SELECTED_COLOR = colors.primary;

/**
 * Ombre directionnelle UNIQUE — lumière en haut-gauche → ombre portée bas-droite + ombre de
 * contact. Identique sur tous les états : réalisme ressenti sans être remarqué (§3).
 */
export const DIRECTIONAL_SHADOW =
  '2px 3px 6px rgba(23,32,26,0.30), 0 1px 2px rgba(23,32,26,0.22)';

/** Tokens géométriques par état (taille + anneau + halo). Aucune couleur ici (voir langage). */
export interface MarkerStateToken {
  /** Diamètre du marqueur (px). */
  size: number;
  /** Épaisseur de l'anneau catégorie (border, px). */
  ring: number;
  /** Rayon du halo teinté (px ; 0 = aucun). */
  halo: number;
  /** Opacité du halo teinté (0–1). */
  haloAlpha: number;
  /** z-index de base de l'état. */
  z: number;
}

export const MARKER_STATE_TOKENS: Record<MarkerState, MarkerStateToken> = {
  standard: { size: 40, ring: 3, halo: 3, haloAlpha: 0.1, z: 1 },
  recommended: { size: 48, ring: 3, halo: 11, haloAlpha: 0.16, z: 2 },
  exceptional: { size: 52, ring: 3, halo: 13, haloAlpha: 0.16, z: 3 },
  selected: { size: 46, ring: 5, halo: 6, haloAlpha: 0, z: 6 },
};

/** Diamètre du badge cryptogramme superposé (px). */
export const MARKER_BADGE_SIZE = 18;

/** Pop de sélection — one-shot au clic (jamais permanent). §6. */
export const MARKER_POP = { scale: 1.05, durationMs: 200 } as const;

/** hex `#RRGGBB` → `rgba(r, g, b, a)` (halos teintés, auras). Pur. */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
