import { Image } from 'expo-image';

import { editorialCryptoAsset, type CryptoId } from '../editorialTypes';

export type { CryptoId };

/**
 * Cryptogramme éditorial YOOTOO — médaillon officiel (asset raster de la collection validée,
 * `assets/images/cryptograms/ed-*.png`). Rendu HD via `expo-image` (cache intégré). Couleurs,
 * relief et ombrage d'origine conservés. Remplace définitivement les glyphes SVG. Le prop `color`
 * est accepté pour compat mais ignoré (le médaillon porte ses propres couleurs).
 */
export function PublicationCrypto({ id, size = 14 }: { id: CryptoId; size?: number; color?: string }) {
  return (
    <Image
      source={editorialCryptoAsset(id)}
      style={{ width: size, height: size }}
      contentFit="contain"
      cachePolicy="memory-disk"
    />
  );
}
