import { type ImageSourcePropType } from 'react-native';

/**
 * Registre des pictogrammes NATURE (mêmes règles que les autres registres). Convention
 * d'auto-câblage : `assets/images/cryptograms/nature/<id>.png`. `require` isolés ici (couche
 * composant) → la couche données reste sans image, testable.
 */
const NATURE_PICTOS: Record<string, ImageSourcePropType> = {
  'parcs-jardins': require('@/assets/images/cryptograms/nature/parcs-jardins.png'),
  randonnees: require('@/assets/images/cryptograms/nature/randonnees.png'),
  'voies-vertes': require('@/assets/images/cryptograms/nature/voies-vertes.png'),
  'lacs-rivieres': require('@/assets/images/cryptograms/nature/lacs-rivieres.png'),
  'reserves-naturelles': require('@/assets/images/cryptograms/nature/reserves-naturelles.png'),
  jardineries: require('@/assets/images/cryptograms/nature/jardineries.png'),
  animaleries: require('@/assets/images/cryptograms/nature/animaleries.png'),
  peche: require('@/assets/images/cryptograms/nature/peche.png'),
  equitation: require('@/assets/images/cryptograms/nature/equitation.png'),
  'plein-air': require('@/assets/images/cryptograms/nature/plein-air.png'),
};

export function naturePicto(id: string): ImageSourcePropType | undefined {
  return NATURE_PICTOS[id];
}
