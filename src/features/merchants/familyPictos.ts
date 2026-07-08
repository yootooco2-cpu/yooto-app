import { type ImageSourcePropType } from 'react-native';

import { bienetrePicto } from './bienetrePictos';
import { restaurantPicto } from './restaurantPictos';

/**
 * Résolveur UNIQUE de pictogramme de sous-catégorie, par famille. Point d'extension unique :
 * pour une future famille (Artisanat, Culture, Mobilité), il suffit d'ajouter son registre
 * `<famille>Pictos.ts` + une branche ici — aucun composant à modifier. Les registres existants
 * (restaurants, bien-être) restent inchangés.
 */
export function familyPicto(familyId: string, itemId: string): ImageSourcePropType | undefined {
  switch (familyId) {
    case 'restaurants':
      return restaurantPicto(itemId);
    case 'bienetre':
      return bienetrePicto(itemId);
    default:
      return undefined;
  }
}
