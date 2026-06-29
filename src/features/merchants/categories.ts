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
  producer_hub: 'producer',
  farm: 'producer',
  ferme: 'producer',
  local_farm: 'producer',
  ranch: 'producer',
  vineyard: 'producer',
  winery: 'producer',
  maraicher: 'producer',
  maraîcher: 'producer',
  apiculteur: 'producer',
  // grocery
  grocery: 'grocery',
  grocery_store: 'grocery',
  supermarket: 'grocery',
  convenience_store: 'grocery',
  eco_grocery: 'grocery',
  ethnic_grocery: 'grocery',
  local_grocery: 'grocery',
  epicerie: 'grocery',
  épicerie: 'grocery',
  vrac: 'grocery',
  market: 'grocery',
  local_market: 'grocery',
  marche: 'grocery',
  marché: 'grocery',
  // restaurant
  restaurant: 'restaurant',
  local_restaurant: 'restaurant',
  resto: 'restaurant',
  cafe: 'restaurant',
  café: 'restaurant',
  local_cafe: 'restaurant',
  coffee_shop: 'restaurant',
  bar: 'restaurant',
  local_bar: 'restaurant',
  food: 'restaurant',
  food_experience: 'restaurant',
  cantine: 'restaurant',
  // shop
  shop: 'shop',
  boutique: 'shop',
  store: 'shop',
  bakery: 'shop',
  artisan_bakery: 'shop',
  pastry_shop: 'shop',
  chocolate_shop: 'shop',
  local_chocolate: 'shop',
  florist: 'shop',
  book_store: 'shop',
  local_bookshop: 'shop',
  bicycle_store: 'shop',
  local_bike: 'shop',
  soft_mobility: 'shop',
  pet_store: 'shop',
  pet_care: 'shop',
  local_pet: 'shop',
  liquor_store: 'shop',
  local_wine_spirits: 'shop',
  boulangerie: 'shop',
  artisan: 'shop',
  ressourcerie: 'shop',
  // service / divers
  service: 'service',
  services: 'service',
  atelier: 'service',
  association: 'service',
  local_business: 'shop',
  establishment: 'shop',
  point_of_interest: 'shop',
};

/**
 * Normalise une catégorie brute (insensible casse/espaces) vers une valeur
 * canonique garantie. Toute l'app passe par cette fonction unique.
 */
export function normalizeMerchantCategory(raw: string): MerchantCategory {
  const key = (raw ?? '').trim().toLowerCase();
  return CATEGORY_ALIASES[key] ?? DEFAULT_CATEGORY;
}
