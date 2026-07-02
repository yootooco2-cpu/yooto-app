import { Image } from 'expo-image';

import { cryptogramDataUri, type CryptogramId } from '@/features/merchants/cryptograms';

type Props = {
  id: CryptogramId;
  /** Taille du cryptogramme (px). Légèrement plus grand que les anciens badges. */
  size?: number;
};

/**
 * Cryptogramme officiel YOOTOO (goutte + pictogramme blanc, couleur de catégorie).
 * SVG custom rendu via expo-image (zéro dépendance). Web (localhost:8081) ; natif plus tard.
 */
export function Cryptogram({ id, size = 30 }: Props) {
  return (
    <Image
      source={{ uri: cryptogramDataUri(id, size) }}
      style={{ width: size, height: size }}
      contentFit="contain"
      // Ombre douce pour détacher le cryptogramme de la photo.
      accessibilityIgnoresInvertColors
    />
  );
}
