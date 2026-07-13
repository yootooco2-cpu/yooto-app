import { useWindowDimensions } from 'react-native';

import { spacing } from '@/design/tokens/spacing';

import { DESKTOP_BREAKPOINT, merchantCardWidth } from './responsive';

/**
 * Largeur d'une carte de commerce = EXACTEMENT celle de la grille Commerçants (référence unique).
 * Mêmes constantes que la grille : marge d'écran `padding="lg"` (spacing.lg) et gap de colonnes
 * `spacing.md`. Réactive au redimensionnement → l'Accueil et Commerçants restent alignés au pixel.
 *
 * Sous le breakpoint desktop, la formule 3 colonnes produit des cartes trop étroites pour porter
 * l'identité d'un commerce (nom coupé, photo timbre-poste — interdit par DESIGN.md). Un PLANCHER
 * « peek » prend alors le relais : une carte dominante + l'amorce de la suivante, photo d'abord.
 */
export function useMerchantCardWidth(): number {
  const { width } = useWindowDimensions();
  const grid = merchantCardWidth(width, spacing.lg, spacing.md);
  if (width >= DESKTOP_BREAKPOINT) return grid;
  const peek = Math.min(Math.round(width * 0.72), 320);
  return Math.max(grid, peek);
}
