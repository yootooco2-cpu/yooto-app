import { type ImageSourcePropType } from 'react-native';

/**
 * Registre des pictogrammes MOBILITÉ (mêmes règles que les autres registres). Convention
 * d'auto-câblage : `assets/images/cryptograms/mobilite/<id>.png`. `require` isolés ici (couche
 * composant) → la couche données reste sans image, testable.
 */
const MOBILITE_PICTOS: Record<string, ImageSourcePropType> = {
  velos: require('@/assets/images/cryptograms/mobilite/velos.png'),
  trottinettes: require('@/assets/images/cryptograms/mobilite/trottinettes.png'),
  'skate-rollers': require('@/assets/images/cryptograms/mobilite/skate-rollers.png'),
  poussettes: require('@/assets/images/cryptograms/mobilite/poussettes.png'),
  'velos-cargo': require('@/assets/images/cryptograms/mobilite/velos-cargo.png'),
  'mobilite-pmr': require('@/assets/images/cryptograms/mobilite/mobilite-pmr.png'),
  covoiturage: require('@/assets/images/cryptograms/mobilite/covoiturage.png'),
  bus: require('@/assets/images/cryptograms/mobilite/bus.png'),
  tramway: require('@/assets/images/cryptograms/mobilite/tramway.png'),
};

export function mobilitePicto(id: string): ImageSourcePropType | undefined {
  return MOBILITE_PICTOS[id];
}
