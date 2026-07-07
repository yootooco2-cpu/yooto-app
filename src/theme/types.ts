import type { ImageSourcePropType } from 'react-native';

import type { SectionKey } from '@/design/theme/sections';

/**
 * Thème de FOND d'un univers : référence son image d'ambiance + le voile teinté à appliquer.
 * Aucun chemin d'image n'est codé dans les écrans — ils passent par ces thèmes (via le registre).
 */
export interface SectionBackgroundTheme {
  key: SectionKey;
  /** Image d'ambiance (WebP optimisé). */
  background: ImageSourcePropType;
  /** Couleur du voile teinté posé sur l'image. */
  veil: string;
  /** Opacité du voile (0..1) — discret pour rester lisible. */
  veilOpacity: number;
}
