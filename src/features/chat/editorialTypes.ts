import type { ImageSourcePropType } from 'react-native';

/**
 * Cryptogrammes éditoriaux YOOTOO — collection officielle (assets raster de la planche validée,
 * découpés en médaillons transparents dans `assets/images/cryptograms/ed-*.png`). SOURCE UNIQUE
 * des types de publication du Chat : id, libellé et asset image. Ordre = ordre de la planche.
 */
export type CryptoId =
  | 'nouveaute'
  | 'arrivage'
  | 'offre'
  | 'degustation'
  | 'marche'
  | 'recolte'
  | 'evenement'
  | 'coup_de_coeur'
  | 'bon_plan'
  | 'menu_du_jour'
  | 'produit_local'
  | 'information'
  | 'artisan'
  | 'offre_speciale'
  | 'duree_limitee'
  | 'ouverture'
  | 'coulisses'
  | 'engagement';

export interface EditorialType {
  id: CryptoId;
  label: string;
}

/** Les 18 types éditoriaux, dans l'ordre de la planche officielle. */
export const EDITORIAL_TYPES: EditorialType[] = [
  { id: 'nouveaute', label: 'Nouveauté' },
  { id: 'arrivage', label: 'Arrivage' },
  { id: 'offre', label: 'Offre' },
  { id: 'degustation', label: 'Dégustation' },
  { id: 'marche', label: 'Marché' },
  { id: 'recolte', label: 'Récolte' },
  { id: 'evenement', label: 'Événement' },
  { id: 'coup_de_coeur', label: 'Coup de cœur' },
  { id: 'bon_plan', label: 'Bon plan' },
  { id: 'menu_du_jour', label: 'Menu du jour' },
  { id: 'produit_local', label: 'Produit local' },
  { id: 'information', label: 'Information' },
  { id: 'artisan', label: 'Artisan' },
  { id: 'offre_speciale', label: 'Offre spéciale' },
  { id: 'duree_limitee', label: 'À durée limitée' },
  { id: 'ouverture', label: 'Ouverture' },
  { id: 'coulisses', label: 'Dans les coulisses' },
  { id: 'engagement', label: 'Engagement' },
];

/** Médaillon image officiel du cryptogramme (asset raster, fond transparent, 256×256). */
const ASSETS: Record<CryptoId, ImageSourcePropType> = {
  nouveaute: require('@/assets/images/cryptograms/ed-nouveaute.png'),
  arrivage: require('@/assets/images/cryptograms/ed-arrivage.png'),
  offre: require('@/assets/images/cryptograms/ed-offre.png'),
  degustation: require('@/assets/images/cryptograms/ed-degustation.png'),
  marche: require('@/assets/images/cryptograms/ed-marche.png'),
  recolte: require('@/assets/images/cryptograms/ed-recolte.png'),
  evenement: require('@/assets/images/cryptograms/ed-evenement.png'),
  coup_de_coeur: require('@/assets/images/cryptograms/ed-coup_de_coeur.png'),
  bon_plan: require('@/assets/images/cryptograms/ed-bon_plan.png'),
  menu_du_jour: require('@/assets/images/cryptograms/ed-menu_du_jour.png'),
  produit_local: require('@/assets/images/cryptograms/ed-produit_local.png'),
  information: require('@/assets/images/cryptograms/ed-information.png'),
  artisan: require('@/assets/images/cryptograms/ed-artisan.png'),
  offre_speciale: require('@/assets/images/cryptograms/ed-offre_speciale.png'),
  duree_limitee: require('@/assets/images/cryptograms/ed-duree_limitee.png'),
  ouverture: require('@/assets/images/cryptograms/ed-ouverture.png'),
  coulisses: require('@/assets/images/cryptograms/ed-coulisses.png'),
  engagement: require('@/assets/images/cryptograms/ed-engagement.png'),
};

/** Source image du cryptogramme (pour `expo-image` / `Image`). */
export function editorialCryptoAsset(id: CryptoId): ImageSourcePropType {
  return ASSETS[id];
}

/** Libellé officiel d'un type éditorial. */
export function editorialLabel(id: CryptoId): string {
  return EDITORIAL_TYPES.find((t) => t.id === id)?.label ?? '';
}
