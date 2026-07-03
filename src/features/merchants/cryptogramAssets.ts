import { Asset } from 'expo-asset';
import { Image, type ImageSourcePropType } from 'react-native';

import type { CryptogramId } from './cryptograms';
import type { QuickFilterId } from './filters';

// cryptogramAssets — bibliothèque officielle des cryptogrammes YOOTOO (assets image
// découpés de la planche de référence validée). Un asset par CryptogramId (mapping,
// noms, ids et couleurs restent définis dans cryptograms.ts, inchangés).

const ASSETS: Record<CryptogramId, ImageSourcePropType> = {
  boulangerie: require('@/assets/images/cryptograms/boulangerie.png'),
  patisserie: require('@/assets/images/cryptograms/patisserie.png'),
  cafe: require('@/assets/images/cryptograms/cafe.png'),
  restaurant: require('@/assets/images/cryptograms/restaurant.png'),
  marche: require('@/assets/images/cryptograms/marche.png'),
  primeur: require('@/assets/images/cryptograms/primeur.png'),
  epicerie: require('@/assets/images/cryptograms/epicerie.png'),
  fromagerie: require('@/assets/images/cryptograms/fromagerie.png'),
  caviste: require('@/assets/images/cryptograms/caviste.png'),
  boucherie: require('@/assets/images/cryptograms/boucherie.png'),
  poissonnerie: require('@/assets/images/cryptograms/poissonnerie.png'),
  traiteur: require('@/assets/images/cryptograms/traiteur.png'),
  fleuriste: require('@/assets/images/cryptograms/fleuriste.png'),
  librairie: require('@/assets/images/cryptograms/librairie.png'),
  culture: require('@/assets/images/cryptograms/culture.png'),
  artisanat: require('@/assets/images/cryptograms/artisanat.png'),
  bienetre: require('@/assets/images/cryptograms/bienetre.png'),
  sport: require('@/assets/images/cryptograms/sport.png'),
  nature: require('@/assets/images/cryptograms/nature.png'),
  mobilite: require('@/assets/images/cryptograms/mobilite.png'),
  transports: require('@/assets/images/cryptograms/transports.png'),
  cooperative: require('@/assets/images/cryptograms/cooperative.png'),
  autres: require('@/assets/images/cryptograms/autres.png'),
  producteur: require('@/assets/images/cryptograms/producteur.png'),
  nearby: require('@/assets/images/cryptograms/nearby.png'),
  open: require('@/assets/images/cryptograms/open.png'),
};

/** Source image du cryptogramme (pour `expo-image` / `Image`). */
export function cryptogramAsset(id: CryptogramId): ImageSourcePropType {
  return ASSETS[id];
}

/**
 * Cryptogramme d'un filtre rapide (`QuickFilter`), ou `undefined` si le filtre
 * n'a pas d'icône dédiée. Mapping : nearby→« Autour de moi », open→« Ouvert
 * maintenant », producers→cryptogramme « Producteurs ».
 */
export function filterCryptogramAsset(id: QuickFilterId): ImageSourcePropType | undefined {
  switch (id) {
    case 'nearby':
      return cryptogramAsset('nearby');
    case 'open':
      return cryptogramAsset('open');
    case 'producers':
      return cryptogramAsset('producteur');
    default:
      return undefined;
  }
}

/**
 * URL résolue de l'asset — pour un `background-image` CSS (marqueurs Mapbox web DOM).
 * Résolution DÉFENSIVE et cross-platform : selon le bundler, `require()` renvoie une string,
 * un objet `{ uri }`, ou une référence de module. On évite de dépendre de
 * `Image.resolveAssetSource` (absent sur certaines builds react-native-web → l'erreur
 * « Image.default.resolveAssetSource is not a function »). Ordre : valeur directe →
 * `Asset.fromModule` (stable Expo Web / RN) → repli natif `resolveAssetSource` si présent.
 */
export function cryptogramAssetUri(id: CryptogramId): string {
  const mod = ASSETS[id] as unknown;

  if (typeof mod === 'string') return mod;
  if (mod && typeof mod === 'object' && typeof (mod as { uri?: unknown }).uri === 'string') {
    return (mod as { uri: string }).uri;
  }

  try {
    const uri = Asset.fromModule(mod as number).uri;
    if (uri) return uri;
  } catch {
    // Asset.fromModule indisponible/incompatible → on tente le repli ci-dessous.
  }

  const resolve = (Image as unknown as {
    resolveAssetSource?: (source: ImageSourcePropType) => { uri?: string } | null;
  }).resolveAssetSource;
  if (typeof resolve === 'function') return resolve(ASSETS[id])?.uri ?? '';

  return '';
}
