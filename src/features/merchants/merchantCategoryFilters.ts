import { cryptogramForMerchant, type CryptogramId } from './cryptograms';
import type { Merchant } from './types';

// merchantCategoryFilters — catégories principales affichées sous la recherche /merchants.
// Réutilise l'attribution cryptogramme (couleur + pictogramme) → cohérence YOOTOO, aucun
// emoji. Le `match` s'appuie sur `cryptogramForMerchant` : une catégorie alimentaire ne
// remonte donc jamais les commerces « autres » (pet_care/élevages/etc.).

export type MerchantCategoryId =
  | 'restaurants'
  | 'cafes'
  | 'boulangeries'
  | 'patisseries'
  | 'producteurs'
  | 'primeurs'
  | 'epiceries'
  | 'marches'
  | 'boucheries'
  | 'fromageries'
  | 'cavistes'
  | 'poissonneries'
  | 'traiteurs'
  | 'fleuristes'
  | 'librairies'
  | 'culture'
  | 'artisanat'
  | 'bienetre'
  | 'sport'
  | 'nature'
  | 'mobilite'
  | 'transports'
  | 'cooperatives'
  | 'autres';

/**
 * Sous-catégorie de découverte : `query` = texte injecté dans la recherche existante
 * (matchesText sur nom + description) → aucun nouveau système de filtrage. Optionnelle :
 * seules certaines catégories en portent (panneau enrichi de l'Accueil).
 */
export interface CategorySubEntry {
  id: string;
  label: string;
  query: string;
}

export interface MerchantCategoryFilter {
  id: MerchantCategoryId;
  label: string;
  /** Cryptogramme pour l'icône + la couleur (source unique de la DA). */
  icon: CryptogramId;
  /** Prédicat pur d'appartenance à la catégorie. */
  match: (merchant: Merchant) => boolean;
  /** Points d'entrée fins affichés dans le panneau de découverte (Accueil). */
  subcategories?: CategorySubEntry[];
}

const cid = (m: Merchant): CryptogramId => cryptogramForMerchant(m);
const sub = (id: string, label: string, query: string): CategorySubEntry => ({ id, label, query });

// Catalogue complet des cryptogrammes officiels (ordre de la planche). Chaque
// catégorie qui EXISTE dans la config peut ainsi s'afficher dans la barre ; le
// prédicat s'appuie sur `cryptogramForMerchant` (aucun commerce parasite ne
// remonte dans une catégorie alimentaire). « Producteurs » utilise le cryptogramme
// vert dédié.
export const MERCHANT_CATEGORY_FILTERS: MerchantCategoryFilter[] = [
  {
    id: 'restaurants', label: 'Restaurants', icon: 'restaurant', match: (m) => cid(m) === 'restaurant',
    subcategories: [
      sub('francais', 'Français', 'français'), sub('italien', 'Italien', 'italien'),
      sub('japonais', 'Japonais', 'japonais'), sub('brasserie', 'Brasserie', 'brasserie'),
      sub('street-food', 'Street food', 'street food'), sub('vegetarien', 'Végétarien', 'végétarien'),
      sub('terrasse', 'Terrasse', 'terrasse'), sub('livraison', 'Livraison locale', 'livraison'),
    ],
  },
  {
    id: 'cafes', label: 'Cafés', icon: 'cafe', match: (m) => cid(m) === 'cafe',
    subcategories: [
      sub('coffee-shop', 'Coffee shop', 'coffee'), sub('salon-de-the', 'Salon de thé', 'thé'),
      sub('brunch', 'Brunch', 'brunch'), sub('terrasse', 'Terrasse', 'terrasse'),
      sub('torrefacteur', 'Torréfacteur', 'torréfact'), sub('patisserie-cafe', 'Pâtisserie café', 'pâtisserie'),
    ],
  },
  {
    id: 'boulangeries', label: 'Boulangeries', icon: 'boulangerie', match: (m) => cid(m) === 'boulangerie',
    subcategories: [
      sub('pain-artisanal', 'Pain artisanal', 'pain'), sub('viennoiseries', 'Viennoiseries', 'viennoiser'),
      sub('patisseries', 'Pâtisseries', 'pâtisserie'), sub('sandwichs', 'Sandwichs', 'sandwich'),
      sub('bio', 'Bio', 'bio'), sub('sans-gluten', 'Sans gluten', 'sans gluten'),
    ],
  },
  {
    id: 'patisseries', label: 'Pâtisseries', icon: 'patisserie', match: (m) => cid(m) === 'patisserie',
    subcategories: [
      sub('gateau', 'Gâteaux', 'gâteau'), sub('chocolat', 'Chocolat', 'chocolat'),
      sub('macaron', 'Macarons', 'macaron'), sub('tarte', 'Tartes', 'tarte'),
      sub('glace', 'Glaces', 'glace'), sub('sans-gluten', 'Sans gluten', 'sans gluten'),
    ],
  },
  {
    id: 'producteurs', label: 'Producteurs', icon: 'producteur', match: (m) => m.isProducer || m.category === 'producer',
    subcategories: [
      sub('fruits-legumes', 'Fruits & légumes', 'primeur'), sub('fromage', 'Fromage', 'fromage'),
      sub('miel', 'Miel', 'miel'), sub('vin', 'Vin', 'vin'),
      sub('viande', 'Viande', 'viande'), sub('oeufs', 'Œufs', 'œufs'),
      sub('marches-locaux', 'Marchés locaux', 'marché'),
    ],
  },
  {
    id: 'primeurs', label: 'Primeurs', icon: 'primeur', match: (m) => cid(m) === 'primeur',
    subcategories: [
      sub('fruits', 'Fruits', 'fruits'), sub('legumes', 'Légumes', 'légumes'),
      sub('bio', 'Bio', 'bio'), sub('saison', 'De saison', 'saison'),
      sub('local', 'Local', 'local'), sub('marche', 'Marché', 'marché'),
    ],
  },
  {
    id: 'epiceries', label: 'Épiceries', icon: 'epicerie', match: (m) => cid(m) === 'epicerie',
    subcategories: [
      sub('epicerie-fine', 'Épicerie fine', 'épicerie'), sub('bio', 'Bio', 'bio'),
      sub('vrac', 'Vrac', 'vrac'), sub('produits-regionaux', 'Produits régionaux', 'régional'),
      sub('caviste', 'Caviste', 'caviste'), sub('primeur', 'Primeur', 'primeur'),
    ],
  },
  {
    id: 'marches', label: 'Marchés', icon: 'marche', match: (m) => cid(m) === 'marche',
    subcategories: [
      sub('marche', 'Marché', 'marché'), sub('producteur', 'Producteur', 'producteur'),
      sub('bio', 'Bio', 'bio'), sub('fromage', 'Fromage', 'fromage'),
      sub('primeur', 'Primeur', 'primeur'), sub('fleur', 'Fleurs', 'fleur'),
    ],
  },
  {
    id: 'boucheries', label: 'Boucheries', icon: 'boucherie', match: (m) => cid(m) === 'boucherie',
    subcategories: [
      sub('viande', 'Viande', 'viande'), sub('volaille', 'Volaille', 'volaille'),
      sub('charcuterie', 'Charcuterie', 'charcuterie'), sub('bio', 'Bio', 'bio'),
      sub('halal', 'Halal', 'halal'), sub('traiteur', 'Traiteur', 'traiteur'),
    ],
  },
  {
    id: 'fromageries', label: 'Fromageries', icon: 'fromagerie', match: (m) => cid(m) === 'fromagerie',
    subcategories: [
      sub('fromage', 'Fromage', 'fromage'), sub('lait-cru', 'Lait cru', 'lait cru'),
      sub('chevre', 'Chèvre', 'chèvre'), sub('affine', 'Affiné', 'affiné'),
      sub('cremerie', 'Crémerie', 'crémerie'), sub('fermier', 'Fermier', 'fermier'),
    ],
  },
  {
    id: 'cavistes', label: 'Cavistes', icon: 'caviste', match: (m) => cid(m) === 'caviste',
    subcategories: [
      sub('vin', 'Vin', 'vin'), sub('biere', 'Bière', 'bière'),
      sub('spiritueux', 'Spiritueux', 'spiritueux'), sub('champagne', 'Champagne', 'champagne'),
      sub('bio', 'Bio', 'bio'), sub('local', 'Local', 'local'),
    ],
  },
  {
    id: 'poissonneries', label: 'Poissonneries', icon: 'poissonnerie', match: (m) => cid(m) === 'poissonnerie',
    subcategories: [
      sub('poisson', 'Poisson', 'poisson'), sub('fruits-de-mer', 'Fruits de mer', 'fruits de mer'),
      sub('huitre', 'Huîtres', 'huître'), sub('saumon', 'Saumon', 'saumon'),
      sub('frais', 'Frais', 'frais'), sub('traiteur', 'Traiteur', 'traiteur'),
    ],
  },
  {
    id: 'traiteurs', label: 'Traiteurs', icon: 'traiteur', match: (m) => cid(m) === 'traiteur',
    subcategories: [
      sub('reception', 'Réception', 'réception'), sub('plats', 'Plats cuisinés', 'plats'),
      sub('brunch', 'Brunch', 'brunch'), sub('vegetarien', 'Végétarien', 'végétarien'),
      sub('evenement', 'Événement', 'événement'), sub('local', 'Local', 'local'),
    ],
  },
  {
    id: 'fleuristes', label: 'Fleuristes', icon: 'fleuriste', match: (m) => cid(m) === 'fleuriste',
    subcategories: [
      sub('bouquet', 'Bouquets', 'bouquet'), sub('plante', 'Plantes', 'plante'),
      sub('mariage', 'Mariage', 'mariage'), sub('deuil', 'Deuil', 'deuil'),
      sub('abonnement', 'Abonnement', 'abonnement'), sub('local', 'Local', 'local'),
    ],
  },
  { id: 'librairies', label: 'Librairies', icon: 'librairie', match: (m) => cid(m) === 'librairie' },
  {
    id: 'culture', label: 'Culture', icon: 'culture', match: (m) => cid(m) === 'culture',
    subcategories: [
      sub('culture', 'Culture', 'culture'), sub('atelier', 'Atelier', 'atelier'),
      sub('sortie', 'Sorties', 'sortie'), sub('enfant', 'Enfants', 'enfant'),
      sub('evenement', 'Événements', 'événement'), sub('exposition', 'Exposition', 'exposition'),
    ],
  },
  {
    id: 'artisanat', label: 'Artisanat', icon: 'artisanat', match: (m) => cid(m) === 'artisanat',
    subcategories: [
      sub('artisan', 'Artisan', 'artisan'), sub('reparation', 'Réparation', 'réparation'),
      sub('bijou', 'Bijoux', 'bijou'), sub('deco', 'Déco', 'déco'),
      sub('cadeau', 'Cadeaux', 'cadeau'), sub('retouche', 'Retouche', 'retouche'),
    ],
  },
  {
    id: 'bienetre', label: 'Bien-être', icon: 'bienetre', match: (m) => cid(m) === 'bienetre',
    subcategories: [
      sub('coiffeur', 'Coiffeur', 'coiffeur'), sub('institut', 'Institut', 'institut'),
      sub('massage', 'Massage', 'massage'), sub('spa', 'Spa', 'spa'),
      sub('beaute-naturelle', 'Beauté naturelle', 'beauté'), sub('sport-sante', 'Sport santé', 'sport'),
    ],
  },
  {
    id: 'sport', label: 'Sport', icon: 'sport', match: (m) => cid(m) === 'sport',
    subcategories: [
      sub('coaching', 'Coaching', 'coaching'), sub('salle', 'Salle de sport', 'salle'),
      sub('velo', 'Vélo', 'vélo'), sub('running', 'Running', 'running'),
      sub('yoga', 'Yoga', 'yoga'), sub('sport-sante', 'Sport santé', 'sport santé'),
    ],
  },
  { id: 'nature', label: 'Nature', icon: 'nature', match: (m) => cid(m) === 'nature' },
  { id: 'mobilite', label: 'Mobilité douce', icon: 'mobilite', match: (m) => cid(m) === 'mobilite' },
  { id: 'transports', label: 'Transports', icon: 'transports', match: (m) => cid(m) === 'transports' },
  { id: 'cooperatives', label: 'Coopératives', icon: 'cooperative', match: (m) => cid(m) === 'cooperative' },
  { id: 'autres', label: 'Autres', icon: 'autres', match: (m) => cid(m) === 'autres' },
];

export function merchantCategoryById(id: MerchantCategoryId | null): MerchantCategoryFilter | null {
  if (!id) return null;
  return MERCHANT_CATEGORY_FILTERS.find((f) => f.id === id) ?? null;
}
