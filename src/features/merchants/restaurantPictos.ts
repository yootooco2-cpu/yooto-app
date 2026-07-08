import { type ImageSourcePropType } from 'react-native';

/**
 * Registre des pictogrammes RESTAURANTS (assets image). Convention d'auto-câblage :
 * pour livrer/remplacer un pictogramme, il suffit de déposer le PNG au chemin
 * `assets/images/cryptograms/restaurants/<id>.png` (même `<id>` que la sous-catégorie) — il
 * s'affiche automatiquement, sans une ligne de code. Les fichiers actuels sont des PLACEHOLDERS
 * (copies de cryptogrammes proches) en attendant l'artwork définitif ; le remplacer par le vrai
 * PNG suffit. Les `require` sont ISOLÉS ici (couche composant) → la couche données reste sans
 * import d'image, donc testable.
 */
const RESTAURANT_PICTOS: Record<string, ImageSourcePropType> = {
  tous: require('@/assets/images/cryptograms/restaurants/tous.png'),
  francaise: require('@/assets/images/cryptograms/restaurants/francaise.png'),
  italienne: require('@/assets/images/cryptograms/restaurants/italienne.png'),
  asiatique: require('@/assets/images/cryptograms/restaurants/asiatique.png'),
  street: require('@/assets/images/cryptograms/restaurants/street.png'),
  grill: require('@/assets/images/cryptograms/restaurants/grill.png'),
  vegetarien: require('@/assets/images/cryptograms/restaurants/vegetarien.png'),
  'bars-cafes': require('@/assets/images/cryptograms/restaurants/bars-cafes.png'),
  brasseries: require('@/assets/images/cryptograms/restaurants/brasseries.png'),
  'fast-casual': require('@/assets/images/cryptograms/restaurants/fast-casual.png'),
  healthy: require('@/assets/images/cryptograms/restaurants/healthy.png'),
  desserts: require('@/assets/images/cryptograms/restaurants/desserts.png'),
  monde: require('@/assets/images/cryptograms/restaurants/monde.png'),
};

export function restaurantPicto(id: string): ImageSourcePropType | undefined {
  return RESTAURANT_PICTOS[id];
}
