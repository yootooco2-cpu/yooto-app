import { Platform, useWindowDimensions } from 'react-native';

import { isDesktopWeb } from './responsive';

/**
 * Vrai lorsqu'on est sur Web/Desktop (≥ breakpoint). Réactif au redimensionnement
 * de la fenêtre web. Câblage RN mince autour de la fonction pure `isDesktopWeb`.
 *
 * Note : la garde anti-mismatch d'hydratation (rendu État A par défaut au 1ᵉʳ paint)
 * est à la charge du consommateur.
 */
export function useIsDesktopWeb(): boolean {
  const { width } = useWindowDimensions();
  return isDesktopWeb(Platform.OS, width);
}
