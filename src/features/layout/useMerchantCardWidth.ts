import { useWindowDimensions } from 'react-native';

import { spacing } from '@/design/tokens/spacing';

import { merchantCardWidth } from './responsive';

/**
 * Largeur d'une carte de commerce = EXACTEMENT celle de la grille Commerçants (référence unique).
 * Mêmes constantes que la grille : marge d'écran `padding="lg"` (spacing.lg) et gap de colonnes
 * `spacing.md`. Réactive au redimensionnement → l'Accueil et Commerçants restent alignés au pixel.
 */
export function useMerchantCardWidth(): number {
  const { width } = useWindowDimensions();
  return merchantCardWidth(width, spacing.lg, spacing.md);
}
