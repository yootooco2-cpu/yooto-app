import { type ImageSourcePropType } from 'react-native';

/**
 * Registre des pictogrammes des FAMILLES d'artisanat (Niveau 2). Mêmes règles que les autres
 * registres. Convention d'auto-câblage : `assets/images/cryptograms/artisanat/<id>.png`.
 */
const ARTISANAT_PICTOS: Record<string, ImageSourcePropType> = {
  'art-du-bois': require('@/assets/images/cryptograms/artisanat/art-du-bois.png'),
  'art-du-metal': require('@/assets/images/cryptograms/artisanat/art-du-metal.png'),
  'art-de-la-pierre': require('@/assets/images/cryptograms/artisanat/art-de-la-pierre.png'),
  'terre-ceramique': require('@/assets/images/cryptograms/artisanat/terre-ceramique.png'),
  'textile-cuir': require('@/assets/images/cryptograms/artisanat/textile-cuir.png'),
  'bijouterie-joaillerie': require('@/assets/images/cryptograms/artisanat/bijouterie-joaillerie.png'),
  'verre-vitrail': require('@/assets/images/cryptograms/artisanat/verre-vitrail.png'),
  'arts-decoratifs': require('@/assets/images/cryptograms/artisanat/arts-decoratifs.png'),
  'restauration-patrimoine': require('@/assets/images/cryptograms/artisanat/restauration-patrimoine.png'),
  'art-de-la-table': require('@/assets/images/cryptograms/artisanat/art-de-la-table.png'),
  'creations-artisanales': require('@/assets/images/cryptograms/artisanat/creations-artisanales.png'),
};

export function artisanatPicto(id: string): ImageSourcePropType | undefined {
  return ARTISANAT_PICTOS[id];
}
