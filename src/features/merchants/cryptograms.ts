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
  | 'autres';

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
};

export function cryptogramColor(id: CryptogramId): string {
  return CRYPTOGRAMS[id].color;
}

export function cryptogramLabel(id: CryptogramId): string {
  return CRYPTOGRAMS[id].label;
}

/** rawCategory (Google `category`/`merchant_type`, minuscule) → cryptogramme. */
const RAW_TO_CRYPTOGRAM: Record<string, CryptogramId> = {
  bakery: 'boulangerie', boulangerie: 'boulangerie', artisan_bakery: 'boulangerie',
  pastry_shop: 'patisserie', confectionery: 'patisserie', candy_store: 'patisserie', chocolate_shop: 'patisserie', local_chocolate: 'patisserie',
  cafe: 'cafe', café: 'cafe', local_cafe: 'cafe', coffee_shop: 'cafe', tea_house: 'cafe', bar: 'cafe', local_bar: 'cafe', wine_bar: 'cafe', brewpub: 'cafe',
  restaurant: 'restaurant', local_restaurant: 'restaurant', resto: 'restaurant', food: 'restaurant', food_experience: 'restaurant', french_restaurant: 'restaurant', cantine: 'restaurant',
  market: 'marche', local_market: 'marche', marche: 'marche', marché: 'marche', farmers_market: 'marche', flea_market: 'marche', producer: 'marche', producers: 'marche', producteur: 'marche', producteurs: 'marche', producer_hub: 'marche', farm: 'marche', ferme: 'marche', local_farm: 'marche', ranch: 'marche',
  maraicher: 'primeur', maraîcher: 'primeur', apiculteur: 'primeur',
  grocery: 'epicerie', grocery_store: 'epicerie', supermarket: 'epicerie', convenience_store: 'epicerie', eco_grocery: 'epicerie', ethnic_grocery: 'epicerie', local_grocery: 'epicerie', epicerie: 'epicerie', épicerie: 'epicerie', vrac: 'epicerie', general_store: 'epicerie', food_store: 'epicerie',
  liquor_store: 'caviste', local_wine_spirits: 'caviste', winery: 'caviste', vineyard: 'caviste',
  butcher: 'boucherie', butcher_shop: 'boucherie',
  deli: 'traiteur', catering_service: 'traiteur',
  florist: 'fleuriste',
  book_store: 'librairie', local_bookshop: 'librairie',
  art_gallery: 'culture', art_studio: 'culture', sculpture: 'culture', tourist_information_center: 'culture',
  artisan: 'artisanat', jewelry_store: 'artisanat', furniture_store: 'artisanat', home_goods_store: 'artisanat', cosmetics_store: 'artisanat', clothing_store: 'artisanat', womens_clothing_store: 'artisanat', gift_shop: 'artisanat', manufacturer: 'artisanat', ressourcerie: 'artisanat', thrift_store: 'artisanat',
  spa: 'bienetre', wellness: 'bienetre', massage: 'bienetre',
  sport: 'sport', sports_coaching: 'sport', sportswear_store: 'sport',
  nature: 'nature', city_park: 'nature', dog_park: 'nature', garden: 'nature', garden_center: 'nature',
  soft_mobility: 'mobilite', bicycle_store: 'mobilite', local_bike: 'mobilite',
  transports: 'transports',
  cooperative: 'cooperative', association: 'cooperative', association_or_organization: 'cooperative',
};

/** Repli par bucket canonique quand la rawCategory est inconnue. */
const BUCKET_TO_CRYPTOGRAM: Record<MerchantCategory, CryptogramId> = {
  producer: 'marche',
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

// ── Rendu SVG (goutte + pictogramme blanc) ──────────────────────────────────────────────
// Forme « goutte de carte » (viewBox 24×24), tête ≈ (12, 9.7). Picto blanc centré dessus.

const PIN =
  'M12 1.6c-4.5 0-8.1 3.6-8.1 8.1 0 5.7 8.1 12.7 8.1 12.7s8.1-7 8.1-12.7c0-4.5-3.6-8.1-8.1-8.1z';

/** Pictogramme blanc par catégorie (formes simples, `c` = couleur de fond pour les évidements). */
const ICON: Record<CryptogramId, (c: string) => string> = {
  boulangerie: () => '<ellipse cx="12" cy="9.7" rx="4.6" ry="2.2" transform="rotate(-28 12 9.7)"/>',
  patisserie: () => '<path d="M7.7 12.4 12 6 16.3 12.4Z"/><circle cx="12" cy="7.3" r="1"/>',
  cafe: (c) => `<path d="M8 7.4h6v3a3 3 0 0 1-3 3 3 3 0 0 1-3-3z"/><path d="M14 8.1h1.3a1.3 1.3 0 0 1 0 2.6H14z" fill="none" stroke="#fff" stroke-width="1"/><rect x="8" y="13.4" width="6" height="0.9" rx="0.4"/><rect x="8.5" y="7.4" width="5" height="1" fill="${c}"/>`,
  restaurant: () =>
    '<rect x="9" y="6" width="0.9" height="8" rx="0.4"/><rect x="8" y="6" width="0.6" height="2.6"/><rect x="10.2" y="6" width="0.6" height="2.6"/><rect x="13.6" y="6" width="0.9" height="8" rx="0.4"/><path d="M13.6 6c1.4 0 1.4 4 0 4z"/>',
  marche: () => '<path d="M7 9 12 6 17 9Z"/><rect x="8" y="9" width="8" height="4.6" rx="0.6"/>',
  primeur: (c) => `<circle cx="12" cy="10.4" r="3.2"/><path d="M12 7.1c0-1.1.9-1.7 1.8-1.5-.1 1-.8 1.6-1.8 1.5z"/><path d="M12 7.2v3" stroke="${c}" stroke-width="0.7"/>`,
  epicerie: () =>
    '<path d="M8 8.2h8v5.6a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z"/><path d="M9.8 8.2a2.2 2.2 0 0 1 4.4 0" fill="none" stroke="#fff" stroke-width="1"/>',
  fromagerie: (c) =>
    `<path d="M6 12.2 16 7.2V12.2Z"/><circle cx="12" cy="10.8" r="0.6" fill="${c}"/><circle cx="14" cy="10.1" r="0.5" fill="${c}"/><circle cx="10" cy="11.4" r="0.5" fill="${c}"/>`,
  caviste: () => '<path d="M11 6h2v2l.8 1.6v4.6a.8.8 0 0 1-.8.8h-2a.8.8 0 0 1-.8-.8V9.6L11 8z"/>',
  boucherie: () => '<path d="M8 7.2h5a1 1 0 0 1 1 1v3H8z"/><rect x="14" y="7.6" width="2.6" height="0.9" rx="0.4"/>',
  poissonnerie: (c) =>
    `<path d="M6.8 10c2-2.6 6.2-2.6 8.2 0-2 2.6-6.2 2.6-8.2 0z"/><path d="M15 10 17.2 8.2v3.6z"/><circle cx="9" cy="9.5" r="0.5" fill="${c}"/>`,
  traiteur: () => '<path d="M7 12a5 5 0 0 1 10 0z"/><rect x="6.4" y="12" width="11.2" height="0.9" rx="0.4"/><circle cx="12" cy="6.7" r="0.7"/>',
  fleuriste: (c) =>
    `<circle cx="12" cy="7.5" r="1.5"/><circle cx="9.6" cy="9.4" r="1.5"/><circle cx="14.4" cy="9.4" r="1.5"/><circle cx="10.5" cy="12" r="1.5"/><circle cx="13.5" cy="12" r="1.5"/><circle cx="12" cy="9.9" r="1.3" fill="${c}"/>`,
  librairie: (c) =>
    `<path d="M7 6.6h4.4v8.4H8a1 1 0 0 1-1-1z"/><path d="M12.6 6.6H17v7.4a1 1 0 0 1-1 1h-3.4z"/><path d="M12 6.6v8.4" stroke="${c}" stroke-width="0.6"/>`,
  culture: () =>
    '<path d="M7.6 8 12 5.6 16.4 8Z"/><rect x="8" y="13" width="8" height="1"/><rect x="8.6" y="8.2" width="1" height="4.8"/><rect x="11.5" y="8.2" width="1" height="4.8"/><rect x="14.4" y="8.2" width="1" height="4.8"/>',
  artisanat: () =>
    '<g transform="rotate(45 12 10)"><rect x="11.3" y="6.6" width="1.4" height="7.4" rx="0.5"/><rect x="9" y="6.3" width="6" height="2.3" rx="0.6"/></g>',
  bienetre: (c) =>
    `<path d="M12 6c3 1 4 4 2.5 6.6C13 15 10 14.4 9 12c-1-2.6 0-5.1 3-6z"/><path d="M10.8 12c1-1.6 2.5-2.5 3.6-2.9" fill="none" stroke="${c}" stroke-width="0.7"/>`,
  sport: () =>
    '<rect x="6.8" y="8.9" width="1.7" height="4.2" rx="0.5"/><rect x="8.5" y="9.9" width="1" height="2.2"/><rect x="14.5" y="9.9" width="1" height="2.2"/><rect x="15.5" y="8.9" width="1.7" height="4.2" rx="0.5"/><rect x="9.5" y="10.5" width="5" height="1"/>',
  nature: (c) =>
    `<path d="M12 6c2.6 1.5 3.6 4.6 0 8.2-3.6-3.6-2.6-6.7 0-8.2z"/><path d="M12 8v5.4" stroke="${c}" stroke-width="0.7"/>`,
  mobilite: () =>
    '<g fill="none" stroke="#fff" stroke-width="1"><circle cx="8.6" cy="12" r="2.2"/><circle cx="15.4" cy="12" r="2.2"/><path d="M8.6 12 11 9h3l-1.6 3M11 9h1.8"/></g>',
  transports: (c) =>
    `<rect x="7" y="6.6" width="10" height="6.8" rx="1"/><rect x="8" y="8" width="3.2" height="2.4" fill="${c}"/><rect x="12.8" y="8" width="3.2" height="2.4" fill="${c}"/><circle cx="9.4" cy="13.8" r="0.9"/><circle cx="14.6" cy="13.8" r="0.9"/>`,
  cooperative: () =>
    '<circle cx="9.4" cy="8.3" r="1.5"/><circle cx="14.6" cy="8.3" r="1.5"/><path d="M6.6 14.1a2.9 2.9 0 0 1 5.8 0z"/><path d="M11.6 14.1a2.9 2.9 0 0 1 5.8 0z"/>',
  autres: () => '<circle cx="8.8" cy="9.7" r="1.1"/><circle cx="12" cy="9.7" r="1.1"/><circle cx="15.2" cy="9.7" r="1.1"/>',
};

/** SVG complet du cryptogramme (goutte colorée + picto blanc). `size` en px. */
export function cryptogramSvg(id: CryptogramId, size = 28): string {
  const color = CRYPTOGRAMS[id].color;
  const inner = ICON[id](color);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">` +
    `<path d="${PIN}" fill="${color}"/>` +
    `<g fill="#fff">${inner}</g>` +
    `</svg>`
  );
}

/** Data-URI prêt à l'emploi (expo-image côté cartes, background-image côté marqueurs web). */
export function cryptogramDataUri(id: CryptogramId, size = 28): string {
  return `data:image/svg+xml,${encodeURIComponent(cryptogramSvg(id, size))}`;
}
