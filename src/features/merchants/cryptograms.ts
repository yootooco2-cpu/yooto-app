import type { Merchant, MerchantCategory } from './types';

// cryptograms — SOURCE UNIQUE du système officiel de cryptogrammes YOOTOO.
// Forme « goutte de carte » + pictogramme blanc + couleur officielle par catégorie.
// Aucune dépendance : les cryptogrammes sont des SVG customs (rendus via expo-image côté
// cartes, en background-image côté marqueurs web). Réutilisé partout (carte + cartes).

export type CryptogramId =
  | 'boulangerie'
  | 'patisserie'
  | 'cafe'
  | 'restaurant'
  | 'marche'
  | 'primeur'
  | 'epicerie'
  | 'fromagerie'
  | 'caviste'
  | 'boucherie'
  | 'poissonnerie'
  | 'traiteur'
  | 'fleuriste'
  | 'librairie'
  | 'culture'
  | 'artisanat'
  | 'bienetre'
  | 'sport'
  | 'nature'
  | 'mobilite'
  | 'transports'
  | 'cooperative'
  | 'autres'
  // Cryptogrammes transverses (hors attribution auto) : catégorie « Producteurs »
  // dédiée + deux filtres rapides de la planche officielle. Volontairement absents
  // de RAW_TO_CRYPTOGRAM/BUCKET_TO_CRYPTOGRAM → jamais renvoyés par
  // cryptogramForMerchant (l'attribution des commerces reste strictement inchangée).
  | 'producteur'
  | 'nearby'
  | 'open';

/** Libellé + couleur officielle (palette YOOTOO). */
export const CRYPTOGRAMS: Record<CryptogramId, { label: string; color: string }> = {
  boulangerie: { label: 'Boulangerie', color: '#5AA64E' },
  patisserie: { label: 'Pâtisserie', color: '#D8A99B' },
  cafe: { label: 'Café', color: '#6F4E37' }, // brun espresso (remplace l'ancien violet)
  restaurant: { label: 'Restaurant', color: '#BC5C3D' },
  marche: { label: 'Marché', color: '#DB5A4A' },
  primeur: { label: 'Primeur', color: '#8FBF6A' },
  epicerie: { label: 'Épicerie', color: '#46703F' },
  fromagerie: { label: 'Fromagerie', color: '#D9A93E' },
  caviste: { label: 'Caviste', color: '#7E2E3C' },
  boucherie: { label: 'Boucherie', color: '#B23A48' },
  poissonnerie: { label: 'Poissonnerie', color: '#2E7DA1' },
  traiteur: { label: 'Traiteur', color: '#C57B3C' },
  fleuriste: { label: 'Fleuriste', color: '#E0A6BE' },
  librairie: { label: 'Librairie', color: '#4C5599' },
  culture: { label: 'Culture', color: '#6A4A9C' },
  artisanat: { label: 'Artisanat', color: '#5E6B73' },
  bienetre: { label: 'Bien-être', color: '#3FA8A0' },
  sport: { label: 'Sport', color: '#7A8450' },
  nature: { label: 'Nature', color: '#3D5A34' },
  mobilite: { label: 'Mobilité douce', color: '#5FB0E0' },
  transports: { label: 'Transports', color: '#2C4A7A' },
  cooperative: { label: 'Coopérative', color: '#2E8BD6' },
  autres: { label: 'Autres', color: '#9E9C92' },
  // Couleurs échantillonnées sur la planche officielle (fond du pin).
  producteur: { label: 'Producteurs', color: '#416731' },
  nearby: { label: 'Autour de moi', color: '#5688BC' },
  open: { label: 'Ouvert maintenant', color: '#65851A' },
};

export function cryptogramColor(id: CryptogramId): string {
  return CRYPTOGRAMS[id].color;
}

export function cryptogramLabel(id: CryptogramId): string {
  return CRYPTOGRAMS[id].label;
}

/**
 * rawCategory (Google `category`/`merchant_type`, minuscule) → cryptogramme.
 * SOURCE UNIQUE utilisée partout (cartes, marqueurs carte, résultats). Couvre l'intégralité
 * du vocabulaire connu (cf. `categories.ts`) + synonymes FR/EN des 24 catégories officielles,
 * pour qu'aucune catégorie réelle ne retombe sur « Autres ». Les valeurs génériques
 * (shop/store/point_of_interest…) et parasites (pet_care/toilettage/pompes funèbres…) sont
 * volontairement ABSENTES → elles tombent sur « Autres » via le bucket (comportement voulu).
 */
const RAW_TO_CRYPTOGRAM: Record<string, CryptogramId> = {
  // Boulangerie
  bakery: 'boulangerie', artisan_bakery: 'boulangerie', boulangerie: 'boulangerie', boulanger: 'boulangerie', bread: 'boulangerie',
  // Pâtisserie
  pastry_shop: 'patisserie', patisserie: 'patisserie', pâtisserie: 'patisserie', patissier: 'patisserie', confectionery: 'patisserie', candy_store: 'patisserie', chocolate_shop: 'patisserie', chocolatier: 'patisserie', local_chocolate: 'patisserie', ice_cream_shop: 'patisserie', glacier: 'patisserie', dessert: 'patisserie',
  // Café
  cafe: 'cafe', café: 'cafe', local_cafe: 'cafe', coffee_shop: 'cafe', coffee: 'cafe', tea_house: 'cafe', salon_de_the: 'cafe', bar: 'cafe', local_bar: 'cafe', wine_bar: 'cafe', brewpub: 'cafe', pub: 'cafe',
  // Restaurant
  restaurant: 'restaurant', local_restaurant: 'restaurant', resto: 'restaurant', food: 'restaurant', food_experience: 'restaurant', french_restaurant: 'restaurant', fast_food: 'restaurant', pizzeria: 'restaurant', bistro: 'restaurant', brasserie: 'restaurant', cantine: 'restaurant', meal_takeaway: 'restaurant', meal_delivery: 'restaurant',
  // Marché
  market: 'marche', local_market: 'marche', marche: 'marche', marché: 'marche', farmers_market: 'marche', flea_market: 'marche', market_hall: 'marche', covered_market: 'marche', halle: 'marche', halles: 'marche',
  // Producteur (cryptogramme dédié)
  producer: 'producteur', producers: 'producteur', producteur: 'producteur', producteurs: 'producteur', producer_hub: 'producteur', farm: 'producteur', ferme: 'producteur', local_farm: 'producteur', ranch: 'producteur', farm_shop: 'producteur', vente_directe: 'producteur',
  // Primeur
  maraicher: 'primeur', maraîcher: 'primeur', primeur: 'primeur', greengrocer: 'primeur', fruits_legumes: 'primeur', fruit_and_vegetable_store: 'primeur', produce: 'primeur', apiculteur: 'primeur', miel: 'primeur',
  // Épicerie
  grocery: 'epicerie', grocery_store: 'epicerie', supermarket: 'epicerie', convenience_store: 'epicerie', eco_grocery: 'epicerie', ethnic_grocery: 'epicerie', local_grocery: 'epicerie', epicerie: 'epicerie', épicerie: 'epicerie', epicerie_fine: 'epicerie', vrac: 'epicerie', bulk_store: 'epicerie', general_store: 'epicerie', food_store: 'epicerie', health_food_store: 'epicerie', organic_shop: 'epicerie',
  // Fromagerie
  cheese_shop: 'fromagerie', fromagerie: 'fromagerie', fromager: 'fromagerie', cremerie: 'fromagerie', crémerie: 'fromagerie', creamery: 'fromagerie', dairy: 'fromagerie',
  // Caviste
  liquor_store: 'caviste', local_wine_spirits: 'caviste', caviste: 'caviste', wine_shop: 'caviste', wine_store: 'caviste', winery: 'caviste', vineyard: 'caviste', cave_a_vin: 'caviste',
  // Boucherie
  butcher: 'boucherie', butcher_shop: 'boucherie', boucherie: 'boucherie', boucher: 'boucherie', charcuterie: 'boucherie', charcutier: 'boucherie',
  // Poissonnerie
  fishmonger: 'poissonnerie', fish_market: 'poissonnerie', seafood: 'poissonnerie', seafood_market: 'poissonnerie', poissonnerie: 'poissonnerie', poissonnier: 'poissonnerie',
  // Traiteur
  deli: 'traiteur', delicatessen: 'traiteur', catering_service: 'traiteur', caterer: 'traiteur', traiteur: 'traiteur',
  // Fleuriste
  florist: 'fleuriste', fleuriste: 'fleuriste', flower_shop: 'fleuriste', flower: 'fleuriste',
  // Librairie
  book_store: 'librairie', local_bookshop: 'librairie', bookshop: 'librairie', bookstore: 'librairie', librairie: 'librairie', libraire: 'librairie', library: 'librairie', bibliotheque: 'librairie', bibliothèque: 'librairie',
  // Culture
  art_gallery: 'culture', art_studio: 'culture', gallery: 'culture', galerie: 'culture', sculpture: 'culture', museum: 'culture', musee: 'culture', musée: 'culture', cultural_center: 'culture', theater: 'culture', theatre: 'culture', théâtre: 'culture', movie_theater: 'culture', cinema: 'culture', cinéma: 'culture', culture: 'culture', tourist_information_center: 'culture', tourist_attraction: 'culture',
  // Artisanat
  artisan: 'artisanat', artisanat: 'artisanat', craft: 'artisanat', craft_store: 'artisanat', jewelry_store: 'artisanat', bijouterie: 'artisanat', furniture_store: 'artisanat', home_goods_store: 'artisanat', cosmetics_store: 'artisanat', clothing_store: 'artisanat', womens_clothing_store: 'artisanat', gift_shop: 'artisanat', manufacturer: 'artisanat', ressourcerie: 'artisanat', thrift_store: 'artisanat', atelier: 'artisanat', workshop: 'artisanat', repair: 'artisanat', reparation: 'artisanat', réparation: 'artisanat', cordonnier: 'artisanat', pressing: 'artisanat',
  // Bien-être
  spa: 'bienetre', wellness: 'bienetre', massage: 'bienetre', bienetre: 'bienetre', bien_etre: 'bienetre', hair_salon: 'bienetre', hairdresser: 'bienetre', coiffeur: 'bienetre', barber: 'bienetre', beauty_salon: 'bienetre', beaute: 'bienetre', beauté: 'bienetre', institut: 'bienetre', nail_salon: 'bienetre', esthetique: 'bienetre',
  // Sport
  sport: 'sport', sports_coaching: 'sport', sportswear_store: 'sport', gym: 'sport', fitness: 'sport', fitness_center: 'sport', salle_de_sport: 'sport', yoga: 'sport', yoga_studio: 'sport', sports_club: 'sport', coaching: 'sport',
  // Nature
  nature: 'nature', city_park: 'nature', park: 'nature', parc: 'nature', dog_park: 'nature', garden: 'nature', jardin: 'nature', garden_center: 'nature', plant_nursery: 'nature', jardinerie: 'nature', pepiniere: 'nature',
  // Mobilité douce
  soft_mobility: 'mobilite', bicycle_store: 'mobilite', local_bike: 'mobilite', bike_shop: 'mobilite', velo: 'mobilite', vélo: 'mobilite', bike_repair: 'mobilite', mobilite: 'mobilite', scooter: 'mobilite', trottinette: 'mobilite',
  // Transports
  transports: 'transports', transport: 'transports', transit_station: 'transports', bus_station: 'transports', train_station: 'transports', gare: 'transports', subway_station: 'transports', parking: 'transports', car_rental: 'transports',
  // Coopérative
  cooperative: 'cooperative', coop: 'cooperative', cooperative_store: 'cooperative', association: 'cooperative', association_or_organization: 'cooperative', amap: 'cooperative', collectif: 'cooperative',
};

/** Repli par bucket canonique quand la rawCategory est inconnue. */
const BUCKET_TO_CRYPTOGRAM: Record<MerchantCategory, CryptogramId> = {
  producer: 'producteur',
  grocery: 'epicerie',
  restaurant: 'restaurant',
  shop: 'autres',
  service: 'autres',
};

/** Résout un alias exact/connu depuis une valeur brute (insensible casse/espaces). */
function resolveAlias(raw: string | undefined): CryptogramId | undefined {
  if (!raw) return undefined;
  return RAW_TO_CRYPTOGRAM[raw.trim().toLowerCase()];
}

/**
 * Résout le cryptogramme d'un commerce selon une priorité STRICTE et déterministe :
 *   1. alias exact/connu sur la catégorie Google (`rawCategory`) ;
 *   2. alias exact/connu sur le `merchant_type` YOOTOO (récupère la précision quand la
 *      catégorie Google est générique — local_business, point_of_interest, store…) ;
 *   3. catégorie normalisée (bucket) — UNIQUEMENT vers des cryptogrammes sûrs
 *      (marché/épicerie/restaurant), jamais café ni caviste ;
 *   4. inconnu → « Autres ».
 *
 * Garantie : une catégorie non résolue tombe TOUJOURS sur « Autres » — jamais sur un
 * cryptogramme spécifique d'une autre catégorie (aucun café↔caviste, restaurant↔producteur).
 */
export function cryptogramForMerchant(
  merchant: Pick<Merchant, 'rawCategory' | 'rawMerchantType' | 'category'>,
): CryptogramId {
  const byCategory = resolveAlias(merchant.rawCategory);
  if (byCategory) return byCategory;

  const byMerchantType = resolveAlias(merchant.rawMerchantType);
  if (byMerchantType) return byMerchantType;

  const byBucket = BUCKET_TO_CRYPTOGRAM[merchant.category];
  if (byBucket && byBucket !== 'autres') return byBucket;

  return 'autres';
}

// ── Rendu ────────────────────────────────────────────────────────────────────────────────
// Les pictogrammes (assets image de la bibliothèque officielle) vivent dans
// `cryptogramAssets.ts` : cryptogramAsset(id) (source expo-image) et cryptogramAssetUri(id)
// (URL résolue pour background-image côté marqueurs web). Ids/noms/couleurs/mapping ci-dessus
// restent la source de vérité et sont inchangés.
