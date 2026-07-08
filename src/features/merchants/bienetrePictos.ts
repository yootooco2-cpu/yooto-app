import { type ImageSourcePropType } from 'react-native';

/**
 * Registre des pictogrammes BIEN-ÊTRE (mêmes règles que `restaurantPictos`). Convention
 * d'auto-câblage : `assets/images/cryptograms/bienetre/<id>.png` → affiché automatiquement.
 * `require` isolés ici (couche composant) → la couche données reste sans image, testable.
 */
const BIENETRE_PICTOS: Record<string, ImageSourcePropType> = {
  'spa-hammam': require('@/assets/images/cryptograms/bienetre/spa-hammam.png'),
  fitness: require('@/assets/images/cryptograms/bienetre/fitness.png'),
  yoga: require('@/assets/images/cryptograms/bienetre/yoga.png'),
  pilates: require('@/assets/images/cryptograms/bienetre/pilates.png'),
  'coaching-sportif': require('@/assets/images/cryptograms/bienetre/coaching-sportif.png'),
  naturopathie: require('@/assets/images/cryptograms/bienetre/naturopathie.png'),
  tatoueur: require('@/assets/images/cryptograms/bienetre/tatoueur.png'),
  perceur: require('@/assets/images/cryptograms/bienetre/perceur.png'),
};

export function bienetrePicto(id: string): ImageSourcePropType | undefined {
  return BIENETRE_PICTOS[id];
}
