import type { MerchantCategory } from './types';

/** Catégories canoniques actuelles (source unique). */
export const MERCHANT_CATEGORIES = [
  'producer',
  'grocery',
  'restaurant',
  'shop',
  'service',
] as const;

/** Libellés lisibles par catégorie. */
export const CATEGORY_LABELS: Record<MerchantCategory, string> = {
  producer: 'Producteur',
  grocery: 'Épicerie',
  restaurant: 'Restaurant',
  shop: 'Boutique',
  service: 'Service',
};

/** Catégorie de repli quand la valeur brute est inconnue. */
const DEFAULT_CATEGORY: MerchantCategory = 'shop';

/**
 * Dictionnaire central des alias → catégorie canonique.
 * AJOUTER une nouvelle catégorie ici (et dans `MERCHANT_CATEGORIES`, `CATEGORY_LABELS`,
 * le type `MerchantCategory`) suffit : le mapper/datasource n'a PAS à changer.
 */
const CATEGORY_ALIASES: Record<string, MerchantCategory> = {
  // producer
  producer: 'producer',
  producers: 'producer',
  producteur: 'producer',
  producteurs: 'producer',
  farm: 'producer',
  ferme: 'producer',
  maraicher: 'producer',
  maraîcher: 'producer',
  apiculteur: 'producer',
  // grocery
  grocery: 'grocery',
  epicerie: 'grocery',
  épicerie: 'grocery',
  vrac: 'grocery',
  market: 'grocery',
  marche: 'grocery',
  marché: 'grocery',
  // restaurant
  restaurant: 'restaurant',
  resto: 'restaurant',
  cafe: 'restaurant',
  café: 'restaurant',
  cantine: 'restaurant',
  bar: 'restaurant',
  // shop
  shop: 'shop',
  boutique: 'shop',
  store: 'shop',
  bakery: 'shop',
  boulangerie: 'shop',
  artisan: 'shop',
  ressourcerie: 'shop',
  // service
  service: 'service',
  services: 'service',
  atelier: 'service',
  association: 'service',
};

/**
 * Normalise une catégorie brute (insensible casse/espaces) vers une valeur
 * canonique garantie. Toute l'app passe par cette fonction unique.
 */
export function normalizeMerchantCategory(raw: string): MerchantCategory {
  const key = (raw ?? '').trim().toLowerCase();
  return CATEGORY_ALIASES[key] ?? DEFAULT_CATEGORY;
}
