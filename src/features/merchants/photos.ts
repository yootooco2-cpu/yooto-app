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

/** Vrai si le commerce dispose d'une photo RÉELLE exploitable. */
export function hasMerchantPhoto(merchant: Merchant): boolean {
  return getMerchantCoverPhoto(merchant) !== null;
}

/**
 * DÉMO — n'exposer que les commerces AVEC une vraie photo dans les surfaces à cartes (Accueil,
 * Commerçants) : réseau qui paraît complet et curé, zéro repli visible. Un seul point de bascule :
 * passer à `false` pour réafficher tous les commerces (y compris ceux au repli premium).
 */
export const DEMO_REQUIRE_PHOTO = true;

/** Filtre une liste selon `DEMO_REQUIRE_PHOTO` (no-op si le flag est désactivé). */
export function withPhotoForDemo(merchants: Merchant[]): Merchant[] {
  return DEMO_REQUIRE_PHOTO ? merchants.filter(hasMerchantPhoto) : merchants;
}
