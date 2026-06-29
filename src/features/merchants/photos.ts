import type { Merchant } from './types';

/**
 * Photo de couverture d'un commerce, par ordre de priorité :
 * 1. coverPhotoUrl  2. photoUrl  3. première de galleryPhotos.
 * Retourne `null` si aucune → le composant affiche le fallback YOOTOO.
 */
export function getMerchantCoverPhoto(merchant: Merchant): string | null {
  if (merchant.coverPhotoUrl) return merchant.coverPhotoUrl;
  if (merchant.photoUrl) return merchant.photoUrl;
  if (merchant.galleryPhotos && merchant.galleryPhotos.length > 0) {
    return merchant.galleryPhotos[0];
  }
  return null;
}
