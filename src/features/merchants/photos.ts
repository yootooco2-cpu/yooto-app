import type { Merchant } from './types';

/** Motifs d'URLs considérées comme NON réelles (fallback/générique serveur). */
const GENERIC_PHOTO_PATTERNS = ['/fallbacks/', 'fallback', 'store.jpg', 'placeholder'];

/** Vrai si l'URL est une photo réelle exploitable (pas un fallback/générique). */
export function isRealPhotoUrl(url: string | null | undefined): url is string {
  if (!url || url.trim().length === 0) return false;
  const lower = url.toLowerCase();
  return !GENERIC_PHOTO_PATTERNS.some((pattern) => lower.includes(pattern));
}

/**
 * Photo de couverture d'un commerce, par ordre de priorité :
 * 1. coverPhotoUrl réelle  2. photoUrl réelle  3. première image réelle de galleryPhotos.
 * Retourne `null` si aucune photo RÉELLE → le composant affiche le fallback YOOTOO premium
 * (on ignore le générique serveur `/fallbacks/store.jpg`).
 */
export function getMerchantCoverPhoto(merchant: Merchant): string | null {
  if (isRealPhotoUrl(merchant.coverPhotoUrl)) return merchant.coverPhotoUrl;
  if (isRealPhotoUrl(merchant.photoUrl)) return merchant.photoUrl;
  const galleryPhoto = merchant.galleryPhotos?.find(isRealPhotoUrl);
  if (galleryPhoto) return galleryPhoto;
  return null;
}
