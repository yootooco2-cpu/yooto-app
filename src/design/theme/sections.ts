import type { ThemeScheme } from './palettes';

/**
 * Identités visuelles par SECTION (univers). Chaque onglet raconte une histoire : couleur
 * principale, dégradé d'ambiance, bokeh, verre teinté (glassmorphism) et halo de l'onglet actif.
 * Résolu selon le schéma clair/sombre. AUCUNE couleur en dur ailleurs : les écrans et la bottom
 * nav lisent ces valeurs via `useSectionTheme()`.
 */
export type SectionKey = 'accueil' | 'carte' | 'commerce' | 'saison' | 'profil';

/** Correspondance route (onglet) → univers. */
export const ROUTE_SECTION: Record<string, SectionKey> = {
  index: 'accueil',
  explore: 'carte',
  merchants: 'commerce',
  'de-saison': 'saison',
  profile: 'profil',
};

export interface SectionTheme {
  key: SectionKey;
  label: string;
  /** Couleur principale de l'univers (icône active, accents). */
  accent: string;
  /** Variante douce (halos, états). */
  accentSoft: string;
  /** Texte/icône posé sur `accent`. */
  onAccent: string;
  /** Dégradé d'ambiance (haut → bas) du fond émotionnel. */
  gradient: [string, string, string];
  /** Deux teintes de bokeh (halos flous du fond). */
  bokeh: [string, string];
  /** Glassmorphism teinté de l'univers (bottom nav, cartes clés). */
  glass: { tint: string; border: string; highlight: string };
  /** Halo de l'onglet actif dans la bottom nav. */
  halo: string;
}

interface SectionDef {
  label: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  gradientLight: [string, string, string];
  gradientDark: [string, string, string];
  bokeh: [string, string];
}

const DEFS: Record<SectionKey, SectionDef> = {
  // 🏠 Corail profond — accueil chaleureux, lever de soleil, énergie.
  accueil: {
    label: 'Accueil',
    accent: '#C6553F',
    accentSoft: '#E48D71',
    onAccent: '#FFF6F1',
    gradientLight: ['#F7DEcC', '#ECAF8E', '#C6553F'],
    gradientDark: ['#3A2018', '#5A2A1C', '#1B0E0A'],
    bokeh: ['rgba(233,175,142,0.55)', 'rgba(198,85,63,0.35)'],
  },
  // 🗺 Sable — exploration, voyage, orientation, lumineux.
  carte: {
    label: 'Carte',
    accent: '#B08A50',
    accentSoft: '#D8C6A2',
    onAccent: '#332B18',
    gradientLight: ['#F1E8D7', '#DECBA8', '#C2A878'],
    gradientDark: ['#2C2717', '#3A331F', '#161207'],
    bokeh: ['rgba(216,198,162,0.55)', 'rgba(176,138,80,0.30)'],
  },
  // 🏪 Terracotta — commerce, artisanat, authenticité, lumière chaude.
  commerce: {
    label: 'Commerçants',
    accent: '#B5533A',
    accentSoft: '#D98B6F',
    onAccent: '#FFF3EE',
    gradientLight: ['#EAC9B6', '#CE8368', '#9E4A34'],
    gradientDark: ['#38190F', '#552417', '#190A06'],
    bokeh: ['rgba(214,139,111,0.55)', 'rgba(158,74,52,0.35)'],
  },
  // 🌿 Vert olive — nature, respiration, fraîcheur, récolte.
  saison: {
    label: 'De saison',
    accent: '#6E7F41',
    accentSoft: '#A9BE86',
    onAccent: '#F8FBEF',
    gradientLight: ['#E1E8CB', '#AEC08A', '#6E7F41'],
    gradientDark: ['#20260F', '#333B1B', '#0E1206'],
    bokeh: ['rgba(169,190,134,0.55)', 'rgba(110,127,65,0.32)'],
  },
  // 👤 Anthracite — élégance, confiance, verre fumé, graphite.
  profil: {
    label: 'Profil',
    accent: '#2E2E2E',
    accentSoft: '#6E6E6E',
    onAccent: '#F3EEE2',
    gradientLight: ['#6A6A6A', '#3A3A3A', '#1C1C1C'],
    gradientDark: ['#3A3A3A', '#242424', '#0E0E0E'],
    bokeh: ['rgba(150,150,150,0.30)', 'rgba(40,40,40,0.45)'],
  },
};

/** Résout l'identité d'une section pour le schéma courant (clair/sombre). */
export function resolveSection(key: SectionKey, scheme: ThemeScheme): SectionTheme {
  const d = DEFS[key];
  const isDark = scheme === 'dark';
  return {
    key,
    label: d.label,
    accent: d.accent,
    accentSoft: d.accentSoft,
    onAccent: d.onAccent,
    gradient: isDark ? d.gradientDark : d.gradientLight,
    bokeh: d.bokeh,
    glass: {
      tint: isDark ? 'rgba(18,20,18,0.55)' : `${d.accent}1F`,
      border: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)',
      highlight: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.35)',
    },
    halo: d.accent,
  };
}

export function sectionForRoute(routeName: string, scheme: ThemeScheme): SectionTheme {
  return resolveSection(ROUTE_SECTION[routeName] ?? 'accueil', scheme);
}
