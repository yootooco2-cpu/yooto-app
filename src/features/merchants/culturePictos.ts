import { type ImageSourcePropType } from 'react-native';

/**
 * Registre des pictogrammes CULTURE (mêmes règles que les autres registres). Convention
 * d'auto-câblage : `assets/images/cryptograms/culture/<id>.png`. `require` isolés ici (couche
 * composant) → la couche données reste sans image, testable.
 */
const CULTURE_PICTOS: Record<string, ImageSourcePropType> = {
  librairies: require('@/assets/images/cryptograms/culture/librairies.png'),
  musees: require('@/assets/images/cryptograms/culture/musees.png'),
  'galeries-art': require('@/assets/images/cryptograms/culture/galeries-art.png'),
  theatres: require('@/assets/images/cryptograms/culture/theatres.png'),
  'salles-concert': require('@/assets/images/cryptograms/culture/salles-concert.png'),
  mediatheques: require('@/assets/images/cryptograms/culture/mediatheques.png'),
  disquaires: require('@/assets/images/cryptograms/culture/disquaires.png'),
  'ateliers-creatifs': require('@/assets/images/cryptograms/culture/ateliers-creatifs.png'),
  patrimoine: require('@/assets/images/cryptograms/culture/patrimoine.png'),
  'evenements-locaux': require('@/assets/images/cryptograms/culture/evenements-locaux.png'),
};

export function culturePicto(id: string): ImageSourcePropType | undefined {
  return CULTURE_PICTOS[id];
}
