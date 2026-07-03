import type { ImageSourcePropType } from 'react-native';

// illustrations — illustrations produit « ardoise de marché », découpées du visuel de
// référence officiel (« Image pour Claude.md ») fourni par l'utilisateur. Même univers
// graphique que le hero (même illustrateur). Clé = nom FR exact (cf. SAISON_CAL).
// Les produits absents de cette table retombent sur un croquis botanique (pas d'emoji).

export const PRODUIT_ILLUS: Record<string, ImageSourcePropType> = {
  // Légumes
  Artichaut: require('@/assets/images/carnet/produits/artichaut.png'),
  Aubergine: require('@/assets/images/carnet/produits/aubergine.png'),
  Courgette: require('@/assets/images/carnet/produits/courgette.png'),
  Concombre: require('@/assets/images/carnet/produits/concombre.png'),
  'Haricot vert': require('@/assets/images/carnet/produits/haricot-vert.png'),
  Tomate: require('@/assets/images/carnet/produits/tomate.png'),
  Poivron: require('@/assets/images/carnet/produits/poivron.png'),
  Radis: require('@/assets/images/carnet/produits/radis.png'),
  Salade: require('@/assets/images/carnet/produits/salade.png'),
  Épinard: require('@/assets/images/carnet/produits/epinard.png'),
  Fenouil: require('@/assets/images/carnet/produits/fenouil.png'),
  'Petit pois': require('@/assets/images/carnet/produits/petit-pois.png'),
  // Fruits
  Abricot: require('@/assets/images/carnet/produits/abricot.png'),
  Cerise: require('@/assets/images/carnet/produits/cerise.png'),
  Fraise: require('@/assets/images/carnet/produits/fraise.png'),
  Framboise: require('@/assets/images/carnet/produits/framboise.png'),
  Melon: require('@/assets/images/carnet/produits/melon.png'),
  Nectarine: require('@/assets/images/carnet/produits/nectarine.png'),
  Pêche: require('@/assets/images/carnet/produits/peche.png'),
  Prune: require('@/assets/images/carnet/produits/prune.png'),
  Raisin: require('@/assets/images/carnet/produits/raisin.png'),
  Groseille: require('@/assets/images/carnet/produits/groseille.png'),
  // 2ᵉ planche (automne/hiver + compléments) — découpée de la nouvelle référence.
  Asperge: require('@/assets/images/carnet/produits/asperge.png'),
  Betterave: require('@/assets/images/carnet/produits/betterave.png'),
  Blette: require('@/assets/images/carnet/produits/blette.png'),
  Brocoli: require('@/assets/images/carnet/produits/brocoli.png'),
  Carotte: require('@/assets/images/carnet/produits/carotte.png'),
  Chou: require('@/assets/images/carnet/produits/chou.png'),
  Courge: require('@/assets/images/carnet/produits/courge.png'),
  Endive: require('@/assets/images/carnet/produits/endive.png'),
  Maïs: require('@/assets/images/carnet/produits/mais.png'),
  Mâche: require('@/assets/images/carnet/produits/mache.png'),
  Navet: require('@/assets/images/carnet/produits/navet.png'),
  Panais: require('@/assets/images/carnet/produits/panais.png'),
  Poireau: require('@/assets/images/carnet/produits/poireau.png'),
  'Pomme de terre': require('@/assets/images/carnet/produits/pomme-de-terre.png'),
  Potiron: require('@/assets/images/carnet/produits/potiron.png'),
  Topinambour: require('@/assets/images/carnet/produits/topinambour.png'),
  Cassis: require('@/assets/images/carnet/produits/cassis.png'),
  Châtaigne: require('@/assets/images/carnet/produits/chataigne.png'),
  Clémentine: require('@/assets/images/carnet/produits/clementine.png'),
  Coing: require('@/assets/images/carnet/produits/coing.png'),
  Figue: require('@/assets/images/carnet/produits/figue.png'),
  Kiwi: require('@/assets/images/carnet/produits/kiwi.png'),
  Mandarine: require('@/assets/images/carnet/produits/mandarine.png'),
  Mirabelle: require('@/assets/images/carnet/produits/mirabelle.png'),
  Mûre: require('@/assets/images/carnet/produits/mure.png'),
  Noisette: require('@/assets/images/carnet/produits/noisette.png'),
  Noix: require('@/assets/images/carnet/produits/noix.png'),
  Orange: require('@/assets/images/carnet/produits/orange.png'),
  Pamplemousse: require('@/assets/images/carnet/produits/pamplemousse.png'),
  Poire: require('@/assets/images/carnet/produits/poire.png'),
  Pomme: require('@/assets/images/carnet/produits/pomme.png'),
  Rhubarbe: require('@/assets/images/carnet/produits/rhubarbe.png'),
};

export function produitIllustration(nom: string): ImageSourcePropType | null {
  return PRODUIT_ILLUS[nom] ?? null;
}
