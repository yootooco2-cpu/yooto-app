import { Image } from 'expo-image';

import { cryptogramAsset } from '@/features/merchants/cryptogramAssets';
import type { CryptogramId } from '@/features/merchants/cryptograms';

type Props = {
  id: CryptogramId;
  /** Taille du cryptogramme (px). */
  size?: number;
};

/**
 * Cryptogramme officiel YOOTOO (goutte peinte, bibliothèque d'assets).
 * Rendu via expo-image ; ids/couleurs inchangés (cf. cryptograms.ts).
 */
export function Cryptogram({ id, size = 30 }: Props) {
  return (
    <Image
      source={cryptogramAsset(id)}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityIgnoresInvertColors
    />
  );
}
