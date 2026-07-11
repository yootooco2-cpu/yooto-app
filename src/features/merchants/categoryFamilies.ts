import { type ComponentProps } from 'react';
import { type Feather } from '@expo/vector-icons';

import type { CryptogramId } from './cryptograms';
import { merchantCategoryById, type MerchantCategoryId } from './merchantCategoryFilters';
import type { Merchant } from './types';

/**
 * Modèle de navigation catégories en ARBRE (N niveaux). Un `CategoryNode` est soit une BRANCHE
 * (a des `children` → on descend d'un niveau), soit une FEUILLE (a un `match` → filtre les
 * commerces). Un nœud peut avoir les deux : `match` = union de la branche (filtre appliqué quand
 * on l'ouvre). Aucune donnée dupliquée : les prédicats regroupent des catégories existantes ou un
 * filtre texte transversal. Le Discovery Engine n'est jamais touché : on POST-filtre uniquement.
 *
 * Structure générique et réutilisable pour toute famille à plusieurs niveaux (Artisanat →
 * familles → métiers ; extensible demain à Culture, Bien-être, Mobilité…).
 */
export type FeatherName = ComponentProps<typeof Feather>['name'];
export type MerchantPredicate = (merchant: Merchant) => boolean;

export interface CategoryNode {
  id: string;
  label: string;
  /** Icône Feather (nœuds de 1er niveau — grandes familles). */
  icon?: FeatherName;
  /** Cryptogramme YOOTOO existant (asset résolu par le composant — couche données sans image). */
  iconId?: CryptogramId;
  /** Clé de pictogramme dédié (registres restaurants/bienetre/artisanat), résolu par le composant. */
  pictoKey?: string;
  /** Touche de couleur d'accent (halo discret aux états actif/hover). */
  accent?: string;
  /** Prédicat de filtrage (feuille = spécifique ; branche = union appliquée à l'ouverture). */
  match?: MerchantPredicate;
  /** Sous-niveau (branche). Absent = feuille. */
  children?: CategoryNode[];
}

const FALSE: MerchantPredicate = () => false;
const catMatch = (id: MerchantCategoryId): MerchantPredicate => merchantCategoryById(id)?.match ?? FALSE;
const anyCat = (...ids: MerchantCategoryId[]): MerchantPredicate => (m) => ids.some((id) => catMatch(id)(m));

const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const haystack = (m: Merchant): string =>
  norm([m.name, m.description, m.rawCategory, m.rawMerchantType, ...(m.tags ?? [])].filter(Boolean).join(' '));
/**
 * INVARIANT (Loi 8 — classe « faux positifs lexicaux ») : un mot-clé est un RADICAL apparié
 * en DÉBUT DE MOT, jamais par inclusion de sous-chaîne. L'inclusion brute faisait matcher
 * 'bus' dans `local_business` (121 fiches parasites). Le radical en début de mot préserve
 * les stems volontaires ('ebenist' → ébéniste/ébénisterie) et élimine toute la classe.
 */
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const stemRe = (needle: string): RegExp => new RegExp(`(?:^|[^a-z0-9])${escapeRe(needle)}`);
/** Affine un prédicat de base par une recherche texte (au moins un radical en début de mot). */
const withText = (base: MerchantPredicate, ...terms: string[]): MerchantPredicate => {
  const needles = terms.map((t) => stemRe(norm(t)));
  return (m) => base(m) && needles.some((re) => re.test(haystack(m)));
};
/** Prédicat purement TEXTUEL (indépendant de toute catégorie) — au moins un terme présent. */
const textMatch = (...terms: string[]): MerchantPredicate => withText(() => true, ...terms);
/** OU de deux prédicats. */
const either = (a: MerchantPredicate, b: MerchantPredicate): MerchantPredicate => (m) => a(m) || b(m);

const item = (id: string, label: string, match: MerchantPredicate): CategoryNode => ({ id, label, match });
/** Feuille ADOSSÉE à une catégorie existante : réutilise son `match` ET son cryptogramme. */
const catItem = (id: MerchantCategoryId, label: string): CategoryNode => ({
  id,
  label,
  match: catMatch(id),
  iconId: merchantCategoryById(id)?.icon,
});
/** Feuille avec pictogramme dédié (registre) + accent, prédicat fourni. */
const pItem = (id: string, label: string, accent: string, match: MerchantPredicate): CategoryNode => ({
  id,
  label,
  match,
  pictoKey: id,
  accent,
});
/** Feuille avec pictogramme dédié + accent + prédicat TEXTE (métier transversal). */
const kItem = (id: string, label: string, accent: string, keywords: string[]): CategoryNode => ({
  id,
  label,
  match: textMatch(...keywords),
  pictoKey: id,
  accent,
});

/**
 * Vignerons & Domaines (GATE 1) — preuve de niveau 1 (NAF viticulture 01.21 / vinification
 * 11.02) d'abord, radicaux textuels en repli (Loi 5 : le texte complète, ne gouverne pas).
 */
const vigneronsMatch: MerchantPredicate = (m) =>
  Boolean(m.nafCode && (m.nafCode.startsWith('01.21') || m.nafCode.startsWith('11.02'))) ||
  textMatch('vigneron', 'viticol', 'vignoble')(m);

const RESTO = anyCat('restaurants', 'cafes');
const BIENETRE = anyCat('bienetre', 'sport');
const CULTURE = anyCat('culture', 'librairies');
const MOBILITE = anyCat('mobilite', 'transports');

/**
 * BIEN-ÊTRE — métiers (soin, mouvement, santé douce, modification corporelle). Structure plate
 * extensible (id = pictogramme, label, accent = couleur du badge, mots-clés). Reconnaissance TEXTE
 * transversale (indépendante de la catégorie commerciale).
 */
interface WellnessMetier {
  id: string;
  label: string;
  accent: string;
  keywords: string[];
}

const BIENETRE_METIERS: WellnessMetier[] = [
  { id: 'spa-hammam', label: 'Spa & Hammam', accent: '#3EA79F', keywords: ['spa', 'hammam', 'sauna', 'balneo', 'thermes'] },
  { id: 'fitness', label: 'Fitness', accent: '#DD6145', keywords: ['fitness', 'musculation', 'salle de sport', 'gym', 'crossfit', 'remise en forme'] },
  { id: 'yoga', label: 'Yoga', accent: '#699E57', keywords: ['yoga'] },
  { id: 'pilates', label: 'Pilates', accent: '#61ACC4', keywords: ['pilates'] },
  { id: 'coaching-sportif', label: 'Coaching sportif', accent: '#DC7B11', keywords: ['coach sportif', 'coaching', 'personal trainer', 'preparateur physique'] },
  { id: 'naturopathie', label: 'Naturopathie', accent: '#7CAF56', keywords: ['naturopathe', 'naturopathie'] },
  { id: 'tatoueur', label: 'Tatoueur', accent: '#7E5799', keywords: ['tatoueur', 'tatouage', 'tattoo'] },
  { id: 'perceur', label: 'Perceur', accent: '#DC648A', keywords: ['perceur', 'piercing', 'percage'] },
];
const BIENETRE_KEYWORDS: string[] = BIENETRE_METIERS.flatMap((m) => m.keywords);
const bienetreMatch: MerchantPredicate = either(BIENETRE, textMatch(...BIENETRE_KEYWORDS));

/**
 * ARTISANAT — navigation à 3 niveaux : Artisanat → FAMILLES (11, avec cryptogramme dédié) →
 * MÉTIERS. Structure plate et extensible : ajouter une famille = une entrée ; ajouter un métier =
 * une ligne. Chaque famille regroupe ses métiers (union de mots-clés) ; reconnaissance TEXTE
 * transversale (un artisan remonte quelle que soit sa catégorie Google).
 */
type MetierDef = [id: string, label: string, keywords: string[]];
interface ArtisanatFamilyDef {
  id: string;
  label: string;
  accent: string;
  metiers: MetierDef[];
}

const ARTISANAT_FAMILIES: ArtisanatFamilyDef[] = [
  {
    id: 'art-du-bois', label: 'Art du bois', accent: '#AA6427',
    metiers: [
      ['ebeniste', 'Ébéniste', ['ebenist']],
      ['menuisier', 'Menuisier', ['menuisier', 'menuiserie']],
      ['charpentier', 'Charpentier', ['charpentier', 'charpente']],
      ['tourneur-bois', 'Tourneur sur bois', ['tourneur sur bois', 'tournage sur bois']],
      ['sculpteur-bois', 'Sculpteur sur bois', ['sculpteur sur bois', 'sculpture sur bois']],
      ['luthier', 'Luthier', ['luthier', 'lutherie']],
      ['encadreur', 'Encadreur', ['encadreur', 'encadrement']],
    ],
  },
  {
    id: 'art-du-metal', label: 'Art du métal', accent: '#6F7882',
    metiers: [
      ['ferronnier', "Ferronnier d'art", ['ferronnier', 'ferronnerie']],
      ['forgeron', 'Forgeron', ['forgeron', 'forge']],
      ['coutelier', 'Coutelier', ['coutelier', 'coutellerie']],
      ['chaudronnier', "Chaudronnier d'art", ['chaudronnier', 'chaudronnerie']],
      ['serrurier-art', "Serrurier d'art", ['serrurier d art', 'serrurerie d art']],
      ['dinandier', 'Dinandier', ['dinandier', 'dinanderie']],
    ],
  },
  {
    id: 'art-de-la-pierre', label: 'Art de la pierre', accent: '#9D8366',
    metiers: [
      ['tailleur-pierre', 'Tailleur de pierre', ['tailleur de pierre', 'taille de pierre']],
      ['marbrier', 'Marbrier', ['marbrier', 'marbrerie']],
      ['sculpteur-pierre', 'Sculpteur sur pierre', ['sculpteur sur pierre', 'sculpture sur pierre']],
      ['graveur-pierre', 'Graveur', ['graveur', 'gravure']],
    ],
  },
  {
    id: 'terre-ceramique', label: 'Terre & Céramique', accent: '#BF693A',
    metiers: [
      ['potier', 'Potier', ['potier', 'poterie']],
      ['ceramiste', 'Céramiste', ['ceramiste', 'ceramique']],
      ['faiencier', 'Faïencier', ['faiencier', 'faience']],
      ['porcelainier', 'Porcelainier', ['porcelainier', 'porcelaine']],
    ],
  },
  {
    id: 'textile-cuir', label: 'Textile & Cuir', accent: '#873629',
    metiers: [
      ['tapissier', 'Tapissier', ['tapissier', 'tapisserie']],
      ['sellier', 'Sellier', ['sellier', 'sellerie']],
      ['maroquinier', 'Maroquinier', ['maroquinier', 'maroquinerie']],
      ['tisserand', 'Tisserand', ['tisserand', 'tissage']],
      ['brodeur', 'Brodeur', ['brodeur', 'broderie']],
      ['couturier-art', "Couturier d'art", ['couturier', 'couture', 'atelier de couture']],
      ['modiste', 'Modiste', ['modiste', 'chapelier', 'chapellerie']],
    ],
  },
  {
    id: 'bijouterie-joaillerie', label: 'Bijouterie & Joaillerie', accent: '#D7992D',
    metiers: [
      ['bijoutier', 'Bijoutier', ['bijoutier', 'bijouterie']],
      ['joaillier', 'Joaillier', ['joaillier', 'joaillerie']],
      ['horloger', 'Horloger', ['horloger', 'horlogerie']],
      ['orfevre', 'Orfèvre', ['orfevre', 'orfevrerie']],
      ['graveur-precieux', 'Graveur sur métaux précieux', ['graveur sur metaux', 'glyptique']],
    ],
  },
  {
    id: 'verre-vitrail', label: 'Verre & Vitrail', accent: '#386198',
    metiers: [
      ['souffleur-verre', 'Souffleur de verre', ['souffleur de verre', 'verre souffle']],
      ['verrier', 'Verrier', ['verrier', 'verrerie']],
      ['maitre-verrier', 'Maître verrier', ['maitre verrier']],
      ['vitrailliste', 'Vitrailliste', ['vitrailliste', 'vitrail']],
    ],
  },
  {
    id: 'arts-decoratifs', label: 'Arts décoratifs', accent: '#754489',
    metiers: [
      ['peintre-decorateur', 'Peintre décorateur', ['peintre decorateur', 'decor peint']],
      ['doreur', 'Doreur', ['doreur', 'dorure']],
      ['mosaiste', 'Mosaïste', ['mosaiste', 'mosaique']],
      ['fresquiste', 'Fresquiste', ['fresquiste', 'fresque']],
    ],
  },
  {
    id: 'restauration-patrimoine', label: 'Restauration & Patrimoine', accent: '#AB8456',
    metiers: [
      ['restaurateur-meubles', 'Restaurateur de meubles', ['restauration de meuble', 'restaurateur de meuble']],
      ['restaurateur-oeuvres', "Restaurateur d'œuvres d'art", ['restauration d oeuvre', "restaurateur d art"]],
      ['relieur', 'Relieur', ['relieur', 'reliure']],
      ['conservateur', 'Conservateur-restaurateur', ['conservateur', 'conservation restauration']],
    ],
  },
  {
    id: 'art-de-la-table', label: 'Art de la table', accent: '#C26221',
    metiers: [
      ['coutelier-table', 'Coutelier artisanal', ['coutelier', 'coutellerie']],
      ['fabricant-ustensiles', "Fabricant d'ustensiles", ['ustensile', 'fabricant d ustensile']],
      ['tourneur-objets', "Tourneur d'objets", ['tourneur sur metal', 'tournage d objet']],
      ['createur-table', "Créateur d'arts de la table", ['arts de la table', 'art de la table']],
    ],
  },
  {
    id: 'creations-artisanales', label: 'Créations artisanales', accent: '#CD7E13',
    metiers: [
      ['savonnier', 'Savonnier', ['savonnier', 'savonnerie', 'savon artisanal']],
      ['cirier', 'Cirier', ['cirier', 'cire']],
      ['fabricant-bougies', 'Fabricant de bougies', ['bougie', 'fabrique de bougie']],
      ['parfumeur', 'Parfumeur artisanal', ['parfumeur', 'parfum artisanal']],
    ],
  },
  {
    // GATE 1 : réparation & réemploi — 138 réparateurs (95.2x) + 80 acteurs seconde main
    // actifs à Montpellier, aucune couverture hors vélos. Cœur de mission (durabilité,
    // acteurs engagés — La Recyclerie d'Anduze, ressourceries…).
    id: 'reparation-seconde-main', label: 'Réparation & Seconde main', accent: '#5E7A5A',
    metiers: [
      ['cordonnier', 'Cordonnier', ['cordonnier', 'cordonnerie']],
      ['retoucherie', 'Retoucherie & Couture', ['retouche', 'retoucherie']],
      ['reparateur', 'Réparateurs', ['reparation', 'reparateur', 'repar']],
      ['ressourcerie', 'Ressourceries & Recycleries', ['ressourcerie', 'recyclerie', 'seconde main', 'friperie', 'depot vente']],
    ],
  },
];

/** Nœuds FAMILLES d'artisanat (Niveau 2) : cryptogramme dédié + accent + enfants (métiers). */
const artisanatChildren: CategoryNode[] = ARTISANAT_FAMILIES.map((f) => ({
  id: f.id,
  label: f.label,
  pictoKey: f.id,
  accent: f.accent,
  match: textMatch(...f.metiers.flatMap((mt) => mt[2])),
  children: f.metiers.map(([id, label, kw]) => item(id, label, textMatch(...kw))),
}));
const ARTISANAT_KEYWORDS: string[] = ARTISANAT_FAMILIES.flatMap((f) => f.metiers.flatMap((mt) => mt[2]));
const artisanatMatch: MerchantPredicate = either(catMatch('artisanat'), textMatch(...ARTISANAT_KEYWORDS));

/**
 * CULTURE — 10 lieux/univers avec pictogramme dédié + couleur d'accent (référence validée).
 * Structure plate extensible. Reconnaissance TEXTE transversale + catégories culture existantes.
 */
const CULTURE_METIERS: { id: string; label: string; accent: string; keywords: string[] }[] = [
  { id: 'librairies', label: 'Librairies', accent: '#8B5E3C', keywords: ['librairie', 'bouquiniste', 'livre'] },
  { id: 'musees', label: 'Musées', accent: '#B79C7A', keywords: ['musee', 'museum'] },
  { id: 'galeries-art', label: "Galeries d'art", accent: '#8A63D2', keywords: ['galerie', 'exposition', 'vernissage'] },
  { id: 'theatres', label: 'Théâtres', accent: '#9B2F3F', keywords: ['theatre'] },
  { id: 'salles-concert', label: 'Salles de concert', accent: '#4A6FA5', keywords: ['salle de concert', 'concert', 'opera', 'philharmonie', 'zenith', 'auditorium', 'salle de spectacle'] },
  { id: 'mediatheques', label: 'Médiathèques', accent: '#5F8D7A', keywords: ['mediatheque', 'bibliotheque'] },
  { id: 'disquaires', label: 'Disquaires', accent: '#3B3B3B', keywords: ['disquaire', 'vinyle', 'disque'] },
  { id: 'ateliers-creatifs', label: 'Ateliers créatifs', accent: '#E09F3E', keywords: ['atelier creatif', 'atelier d art', 'cours de peinture', 'atelier artistique', 'atelier de dessin'] },
  { id: 'patrimoine', label: 'Patrimoine', accent: '#A8895C', keywords: ['patrimoine', 'monument', 'chateau', 'abbaye', 'cathedrale', 'site historique'] },
  { id: 'evenements-locaux', label: 'Événements locaux', accent: '#D77A3D', keywords: ['evenement', 'festival', 'billetterie', 'agenda culturel', 'salle des fetes'] },
];
const CULTURE_KEYWORDS: string[] = CULTURE_METIERS.flatMap((m) => m.keywords);
const cultureMatch: MerchantPredicate = either(CULTURE, textMatch(...CULTURE_KEYWORDS));

/**
 * MOBILITÉ douce — 9 sous-catégories avec pictogramme dédié + couleur d'accent (référence
 * validée). Marche à pied / Autopartage / Itinéraires retirés. Reconnaissance TEXTE transversale
 * + catégories mobilité/transports existantes.
 */
const MOBILITE_METIERS: { id: string; label: string; accent: string; keywords: string[] }[] = [
  { id: 'velos', label: 'Vélos', accent: '#666633', keywords: ['velo', 'cycle', 'bike', 'cyclable', 'reparation de velo'] },
  { id: 'trottinettes', label: 'Trottinettes', accent: '#2D6563', keywords: ['trottinette', 'scooter electrique'] },
  { id: 'skate-rollers', label: 'Skate & Rollers', accent: '#AC541E', keywords: ['skate', 'skateboard', 'roller', 'longboard'] },
  { id: 'poussettes', label: 'Poussettes', accent: '#6F4568', keywords: ['poussette', 'puericulture'] },
  { id: 'velos-cargo', label: 'Vélos cargo', accent: '#797844', keywords: ['velo cargo', 'triporteur', 'biporteur', 'cargo bike'] },
  { id: 'mobilite-pmr', label: 'Mobilité PMR', accent: '#C27D1C', keywords: ['pmr', 'fauteuil roulant', 'mobilite reduite', 'materiel medical', 'handicap'] },
  // Bus / Tramway / Covoiturage RETIRÉS (GATE 1) : aucune famille NAF commerçante, aucun
  // « acteur » à découvrir, impossibles à peupler — et 'bus' matchait local_business (Loi 8).
];
const MOBILITE_KEYWORDS: string[] = MOBILITE_METIERS.flatMap((m) => m.keywords);
const mobiliteMatch: MerchantPredicate = either(MOBILITE, textMatch(...MOBILITE_KEYWORDS));

/**
 * NATURE — 10 sous-catégories (grand air, jardins, eau, animaux…) avec pictogramme dédié +
 * couleur d'accent (référence validée). Structure plate extensible ; reconnaissance TEXTE
 * transversale + catégorie « nature » existante.
 */
const NATURE_METIERS: { id: string; label: string; accent: string; keywords: string[] }[] = [
  { id: 'parcs-jardins', label: 'Parcs & Jardins', accent: '#596827', keywords: ['parc', 'jardin public', 'square', 'arboretum', 'espace vert', 'jardin botanique'] },
  { id: 'randonnees', label: 'Randonnées', accent: '#777140', keywords: ['randonnee', 'sentier', 'rando', 'trek', 'balade nature'] },
  { id: 'voies-vertes', label: 'Voies vertes & pistes cyclables', accent: '#487B58', keywords: ['voie verte', 'piste cyclable', 'veloroute', 'chemin cyclable'] },
  { id: 'lacs-rivieres', label: 'Lacs & Rivières', accent: '#316E7C', keywords: ['lac', 'riviere', 'plan d eau', 'etang', 'base nautique'] },
  { id: 'reserves-naturelles', label: 'Réserves naturelles', accent: '#8E8E47', keywords: ['reserve naturelle', 'parc naturel', 'zone protegee', 'espace naturel'] },
  { id: 'jardineries', label: 'Jardineries & Pépinières', accent: '#7B8B2C', keywords: ['jardinerie', 'pepiniere', 'horticulture', 'graineterie'] },
  { id: 'animaleries', label: 'Animaleries & services animaliers', accent: '#C57522', keywords: ['animalerie', 'toilettage', 'veterinaire', 'pension pour animaux', 'education canine'] },
  { id: 'peche', label: 'Pêche', accent: '#386382', keywords: ['peche', 'articles de peche', 'etang de peche', 'pisciculture'] },
  { id: 'equitation', label: 'Équitation', accent: '#84501E', keywords: ['equitation', 'centre equestre', 'ecurie', 'poney', 'manege', 'haras'] },
  { id: 'plein-air', label: 'Activités de plein air', accent: '#6D7576', keywords: ['plein air', 'escalade', 'via ferrata', 'accrobranche', 'canoe', 'parapente'] },
];
const NATURE_KEYWORDS: string[] = NATURE_METIERS.flatMap((m) => m.keywords);
// Fleuristes (GATE 1) : 74 établissements actifs à Montpellier, prédicat + cryptogramme
// existaient déjà dans le registre — la feuille n'était simplement jamais exposée.
const natureMatch: MerchantPredicate = either(
  either(catMatch('nature'), catMatch('fleuristes')),
  textMatch(...NATURE_KEYWORDS),
);

/**
 * Grandes familles (Niveau 1) + « Tous » géré à part par le composant. Chaque famille est une
 * BRANCHE (`children`). « Plus » regroupe les catégories restantes (nature / autres).
 */
export const CATEGORY_FAMILIES: CategoryNode[] = [
  {
    id: 'alimentation',
    label: 'Alimentation',
    icon: 'shopping-bag',
    match: either(
      anyCat(
        'producteurs', 'boulangeries', 'primeurs', 'fromageries', 'boucheries', 'poissonneries',
        'epiceries', 'traiteurs', 'patisseries', 'marches', 'cavistes', 'cooperatives',
      ),
      vigneronsMatch,
    ),
    children: [
      catItem('producteurs', 'Producteurs'),
      // GATE 1 : 2e gisement de Montpellier (210 établissements actifs 01.21Z) — la
      // production viticole, que ni Cavistes (revente) ni Producteurs (générique) ne révèle.
      { id: 'vignerons-domaines', label: 'Vignerons & Domaines', iconId: 'producteur', match: vigneronsMatch },
      catItem('boulangeries', 'Boulangeries'),
      catItem('primeurs', 'Primeurs'),
      catItem('fromageries', 'Fromageries'),
      catItem('boucheries', 'Boucheries'),
      catItem('poissonneries', 'Poissonneries'),
      catItem('epiceries', 'Épiceries'),
      catItem('traiteurs', 'Traiteurs'),
      catItem('patisseries', 'Pâtisseries'),
      catItem('marches', 'Marchés'),
      catItem('cavistes', 'Cavistes'),
      // RÈGLE PERMANENTE (Loi 8, GATE 1) : une catégorie SOUS le seuil normal de volume ne
      // peut être créée QUE si trois conditions sont vraies SIMULTANÉMENT — coût
      // d'implémentation nul · valeur de différenciation maximale · potentiel entièrement
      // couvrable. Coopératives les satisfait (catItem existant, cœur de mission, 5 acteurs
      // tous connus). La règle remplace l'exception.
      catItem('cooperatives', 'Coopératives'),
    ],
  },
  {
    id: 'restaurants',
    label: 'Restaurants',
    icon: 'coffee',
    match: RESTO,
    children: [
      pItem('tous', 'Tous les restaurants', '#C79A3B', RESTO),
      pItem('francaise', 'Cuisine française', '#4E6A93', withText(RESTO, 'francais', 'france')),
      pItem('italienne', 'Cuisine italienne', '#B24A3B', withText(RESTO, 'italien', 'pizza', 'pizzeria', 'pasta', 'trattoria')),
      pItem('asiatique', 'Cuisine asiatique', '#3E6E9C', withText(RESTO, 'asiat', 'japonais', 'sushi', 'chinois', 'thai', 'vietnam', 'wok', 'coreen', 'ramen')),
      pItem('street', 'Street Food', '#B8863B', withText(RESTO, 'street', 'food truck', 'burger', 'kebab', 'tacos', 'snack')),
      pItem('grill', 'Grill / Viandes', '#C4632B', withText(RESTO, 'grill', 'viande', 'barbecue', 'steak', 'rotisserie', 'grillade')),
      pItem('vegetarien', 'Végétarien / Vegan', '#4E8A54', withText(RESTO, 'vegetarien', 'vegan', 'veggie', 'vegetal')),
      pItem('bars-cafes', 'Bars / Cafés', '#7B4B2A', either(catMatch('cafes'), withText(RESTO, 'bar', 'pub', 'cave a vin'))),
      pItem('brasseries', 'Brasseries / Bistrots', '#C08A2E', withText(RESTO, 'brasserie', 'bistrot', 'taverne', 'biere')),
      pItem('fast-casual', 'Fast Casual', '#C4632B', withText(RESTO, 'fast', 'rapide', 'casual', 'comptoir')),
      pItem('healthy', 'Healthy Bowls', '#4E8A54', withText(RESTO, 'healthy', 'bowl', 'poke', 'salade', 'detox')),
      pItem('desserts', 'Pâtisseries / Desserts', '#6C5B8B', either(catMatch('patisseries'), withText(RESTO, 'dessert', 'glace', 'creperie'))),
      pItem('monde', 'Cuisines du monde', '#2C4A6E', withText(RESTO, 'monde', 'world', 'libanais', 'mexicain', 'indien', 'marocain', 'turc', 'oriental', 'africain')),
    ],
  },
  {
    id: 'bienetre',
    label: 'Bien-être',
    icon: 'heart',
    match: bienetreMatch,
    children: BIENETRE_METIERS.map((m) => kItem(m.id, m.label, m.accent, m.keywords)),
  },
  {
    // Artisanat = 3 niveaux (familles → métiers). Cryptogrammes de familles dédiés.
    id: 'artisanat',
    label: 'Artisanat',
    icon: 'tool',
    match: artisanatMatch,
    children: artisanatChildren,
  },
  {
    // Culture — 10 lieux/univers avec pictogrammes dédiés (référence). Cinémas & Spectacles retirés.
    id: 'culture',
    label: 'Culture',
    icon: 'book-open',
    match: cultureMatch,
    children: CULTURE_METIERS.map((m) => kItem(m.id, m.label, m.accent, m.keywords)),
  },
  {
    // Mobilité douce — 9 sous-catégories avec pictogrammes dédiés (référence). Marche à pied /
    // Autopartage / Itinéraires retirés.
    id: 'mobilite',
    label: 'Mobilité',
    icon: 'navigation',
    match: mobiliteMatch,
    children: MOBILITE_METIERS.map((m) => kItem(m.id, m.label, m.accent, m.keywords)),
  },
  {
    // Nature — 10 sous-catégories avec pictogrammes dédiés (référence). Branche multi-niveaux.
    id: 'nature',
    label: 'Nature',
    icon: 'feather',
    match: natureMatch,
    children: [
      catItem('fleuristes', 'Fleuristes'),
      ...NATURE_METIERS.map((m) => kItem(m.id, m.label, m.accent, m.keywords)),
    ],
  },
];

export function categoryFamilyById(id: string | null): CategoryNode | null {
  if (!id) return null;
  return CATEGORY_FAMILIES.find((f) => f.id === id) ?? null;
}
