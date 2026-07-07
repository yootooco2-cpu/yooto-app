import type { SectionKey } from '@/design/theme/sections';

import { HomeTheme } from './HomeTheme';
import { MerchantTheme } from './MerchantTheme';
import { type SectionBackgroundTheme } from './types';

/**
 * Registre des fonds d'univers. Étendre = créer un `XxxTheme.ts` + l'ajouter ici (jamais dans les
 * écrans). Les univers absents utilisent le fond d'ambiance dégradé de secours (`SectionAmbient`).
 */
export const SECTION_BACKGROUNDS: Partial<Record<SectionKey, SectionBackgroundTheme>> = {
  accueil: HomeTheme,
  commerce: MerchantTheme,
};

export { HomeTheme, MerchantTheme };
export type { SectionBackgroundTheme };
