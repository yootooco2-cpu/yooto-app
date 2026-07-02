// categoryMegaMenu — data du méga-menu de découverte (inspiration Leboncoin, adapté YOOTOO).
// SOURCE UNIQUE des catégories/sous-catégories affichées sous la barre de recherche.
// Chaque sous-catégorie porte une `query` = texte injecté dans la recherche existante
// (matchesText sur nom + description) → aucun nouveau système de filtrage.

export type MegaCategoryId =
  | 'restaurants'
  | 'cafes'
  | 'boulangeries'
  | 'producteurs'
  | 'epiceries'
  | 'bienetre'
  | 'services'
  | 'loisirs';

export interface MegaSubcategory {
  id: string;
  label: string;
  /** Texte de recherche injecté (déclenche le filtre existant). */
  query: string;
}

export interface MegaCategory {
  id: MegaCategoryId;
  label: string;
  /** Icône (emoji — zéro dépendance, cross-platform). */
  icon: string;
  /** Couleur d'accent (palette YOOTOO, cohérente). */
  color: string;
  subcategories: MegaSubcategory[];
}

const sub = (id: string, label: string, query: string): MegaSubcategory => ({ id, label, query });

export const CATEGORY_MEGA_MENU: MegaCategory[] = [
  {
    id: 'restaurants',
    label: 'Restaurants',
    icon: '🍽️',
    color: '#BC5C3D',
    subcategories: [
      sub('francais', 'Français', 'français'),
      sub('italien', 'Italien', 'italien'),
      sub('japonais', 'Japonais', 'japonais'),
      sub('brasserie', 'Brasserie', 'brasserie'),
      sub('street-food', 'Street food', 'street food'),
      sub('vegetarien', 'Végétarien', 'végétarien'),
      sub('terrasse', 'Terrasse', 'terrasse'),
      sub('livraison', 'Livraison locale', 'livraison'),
    ],
  },
  {
    id: 'cafes',
    label: 'Cafés',
    icon: '☕',
    color: '#6F4E37',
    subcategories: [
      sub('coffee-shop', 'Coffee shop', 'coffee'),
      sub('salon-de-the', 'Salon de thé', 'thé'),
      sub('brunch', 'Brunch', 'brunch'),
      sub('terrasse', 'Terrasse', 'terrasse'),
      sub('torrefacteur', 'Torréfacteur', 'torréfact'),
      sub('patisserie-cafe', 'Pâtisserie café', 'pâtisserie'),
    ],
  },
  {
    id: 'boulangeries',
    label: 'Boulangeries',
    icon: '🥖',
    color: '#5AA64E',
    subcategories: [
      sub('pain-artisanal', 'Pain artisanal', 'pain'),
      sub('viennoiseries', 'Viennoiseries', 'viennoiser'),
      sub('patisseries', 'Pâtisseries', 'pâtisserie'),
      sub('sandwichs', 'Sandwichs', 'sandwich'),
      sub('bio', 'Bio', 'bio'),
      sub('sans-gluten', 'Sans gluten', 'sans gluten'),
    ],
  },
  {
    id: 'producteurs',
    label: 'Producteurs',
    icon: '🌾',
    color: '#46703F',
    subcategories: [
      sub('fruits-legumes', 'Fruits & légumes', 'primeur'),
      sub('fromage', 'Fromage', 'fromage'),
      sub('miel', 'Miel', 'miel'),
      sub('vin', 'Vin', 'vin'),
      sub('viande', 'Viande', 'viande'),
      sub('oeufs', 'Œufs', 'œufs'),
      sub('marches-locaux', 'Marchés locaux', 'marché'),
    ],
  },
  {
    id: 'epiceries',
    label: 'Épiceries',
    icon: '🛒',
    color: '#8FBF6A',
    subcategories: [
      sub('epicerie-fine', 'Épicerie fine', 'épicerie'),
      sub('bio', 'Bio', 'bio'),
      sub('vrac', 'Vrac', 'vrac'),
      sub('produits-regionaux', 'Produits régionaux', 'régional'),
      sub('caviste', 'Caviste', 'caviste'),
      sub('primeur', 'Primeur', 'primeur'),
    ],
  },
  {
    id: 'bienetre',
    label: 'Bien-être',
    icon: '🌿',
    color: '#3FA8A0',
    subcategories: [
      sub('coiffeur', 'Coiffeur', 'coiffeur'),
      sub('institut', 'Institut', 'institut'),
      sub('massage', 'Massage', 'massage'),
      sub('spa', 'Spa', 'spa'),
      sub('beaute-naturelle', 'Beauté naturelle', 'beauté'),
      sub('sport-sante', 'Sport santé', 'sport'),
    ],
  },
  {
    id: 'services',
    label: 'Services',
    icon: '🔧',
    color: '#5E6B73',
    subcategories: [
      sub('reparation', 'Réparation', 'réparation'),
      sub('pressing', 'Pressing', 'pressing'),
      sub('cordonnier', 'Cordonnier', 'cordonnier'),
      sub('garage', 'Garage', 'garage'),
      sub('retouche', 'Retouche', 'retouche'),
      sub('domicile', 'Services à domicile', 'domicile'),
    ],
  },
  {
    id: 'loisirs',
    label: 'Loisirs',
    icon: '🎭',
    color: '#6A4A9C',
    subcategories: [
      sub('culture', 'Culture', 'culture'),
      sub('atelier', 'Atelier', 'atelier'),
      sub('sport', 'Sport', 'sport'),
      sub('sorties', 'Sorties', 'sortie'),
      sub('enfants', 'Enfants', 'enfant'),
      sub('evenements', 'Événements locaux', 'événement'),
    ],
  },
];
