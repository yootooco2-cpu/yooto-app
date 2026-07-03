import { Platform } from 'react-native';

// theme (Carnet « De saison ») — DA « étal de primeur / carnet botanique ».
// Palette LOCALE à la feature (ne modifie pas les tokens DS ; on réutilise spacing/radii).
// Réf. officielle : marché provençal + ardoise de marché + épicerie fine.

export const carnetTheme = {
  // Papier / lin
  paper: '#F2E9D2',
  paperDeep: '#E9DBBD',
  paperEdge: '#DAC7A0',
  // Ardoise + cadre bois
  slate: '#26271F',
  slateDeep: '#1E1F18',
  slateEdge: 'rgba(240,235,215,0.10)',
  wood: '#6E4E2C',
  woodLight: '#8A6A3E',
  // Craie
  chalk: '#EFE9D6',
  chalkMuted: 'rgba(239,233,214,0.74)',
  // Accents naturels
  forest: '#374A2E',
  sage: '#7C8A5F',
  terracotta: '#B4552F',
  // Encre sur papier
  ink: '#4A4636',
  inkSoft: '#6E6853',
  line: '#D8C7A2',
} as const;

/** Empattement éditorial (« carte de primeur »). Cormorant absent → repli Georgia serif. */
export const carnetSerif = Platform.select({ ios: 'Georgia', web: 'Georgia', default: undefined });

/** Croquis botanique « encre » (data-URI SVG) — illustration de repli quand un produit n'a
 *  pas encore d'illustration dédiée. Trait manuscrit, jamais un emoji ni une icône plate. */
export function botaniqueSketchUri(color: string = '#EFE9D6'): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>` +
    `<g fill='none' stroke='${color}' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'>` +
    `<path d='M32 56 C 30 42 32 26 35 12'/>` +
    `<path d='M33 46 C 22 44 16 36 13 27 C 24 29 31 35 33 46 Z'/>` +
    `<path d='M34 37 C 45 35 51 27 53 18 C 43 20 36 27 34 37 Z'/>` +
    `<path d='M34 27 C 27 23 23 16 23 9 C 31 12 35 19 34 27 Z'/>` +
    `</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** SVG grain (feTurbulence) en data-URI — texture papier/ardoise discrète via expo-image.
 *  Web : rendu natif du filtre. Natif : peut ne pas rendre le filtre → overlay transparent
 *  (dégradation silencieuse, aucune casse). */
export function grainDataUri(r: number, g: number, b: number, alpha: number, freq = 0.9): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 90 90'>` +
    `<filter id='g'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='2' stitchTiles='stitch'/>` +
    `<feColorMatrix type='matrix' values='0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0 0 0 ${alpha} 0'/></filter>` +
    `<rect width='90' height='90' filter='url(#g)'/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
