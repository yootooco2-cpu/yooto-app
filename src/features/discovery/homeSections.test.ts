/// <reference types="jest" />
import type { Merchant } from '@/features/merchants/types';

import { rankMerchantsEditorially } from './editorial/editorialScore';
import { buildHomeSections, hasRealDistances } from './homeSections';

// Sous jest, le binding natif Nitro n'existe pas : `react-native-mmkv` jette dès l'import
// (chaîne homeSections → cache → … → preferences). On force la factory à échouer comme sur
// Expo Go → le code de production emprunte son VRAI repli mémoire (createDefaultStorage).
// (`jest.mock` est hoisté avant les imports par jest, sa position ici est sans effet.)
jest.mock('react-native-mmkv', () => ({
  createMMKV: () => {
    throw new Error('binding natif absent sous jest');
  },
}));

// Verrous de la décision produit 13/07 — PRIMEUR À LA PROXIMITÉ :
// « Autour de vous » ouvre la page et choisit ses commerces EN PREMIER (distance réelle,
// pas d'arbitrage éditorial) ; les sections suivantes se servent dans les restants (dédup) ;
// sans géolocalisation, le repli est ÉDITORIAL — jamais un ordre alphabétique déguisé en
// proximité. `hasRealDistances` est le seul juge, testé sur son domaine réel (NaN/∞/absent).

const PHOTO = 'https://images.example.com/real.jpg';
const mk = (o: Partial<Merchant> & { id: string; name: string }): Merchant =>
  o as unknown as Merchant;

/** Corpus mixte : cœur de mission attractif ET commerces à faible attrait éditorial,
 *  avec des distances VOLONTAIREMENT décorrélées de l'attrait (le plus proche est un
 *  hors-intention) pour prouver que la proximité ne ré-arbitre pas éditorialement. */
const withGeo = () => [
  mk({ id: 'primeur', name: 'Primeur des Halles', rawCategory: 'greengrocer', category: 'grocery', rating: 4.2, reviewCount: 60, isOpenNow: true, photoUrl: PHOTO, description: 'Fruits et légumes de saison.', distanceKm: 0.15 }),
  mk({ id: 'pompes', name: 'Pompes Funèbres Martin', rawCategory: 'funeral_home', category: 'service', rating: 4.8, reviewCount: 30, isOpenNow: true, photoUrl: PHOTO, description: 'Obsèques.', distanceKm: 0.3 }),
  mk({ id: 'boulangerie', name: 'Boulangerie du Marché', rawCategory: 'bakery', category: 'grocery', rating: 4.4, reviewCount: 210, isOpenNow: true, photoUrl: PHOTO, description: 'Pain au levain.', distanceKm: 0.6 }),
  mk({ id: 'couvreur', name: 'Toiture & Façade Pro', rawCategory: 'roofing_contractor', category: 'service', rating: 4.9, reviewCount: 70, isOpenNow: true, photoUrl: PHOTO, description: 'Couvreur.', distanceKm: 0.9 }),
  mk({ id: 'boucherie', name: 'Boucherie Centrale', rawCategory: 'butcher', category: 'grocery', rating: 4.3, reviewCount: 95, isOpenNow: true, photoUrl: PHOTO, description: 'Viande locale.', distanceKm: 1.4 }),
  mk({ id: 'poissonnerie', name: 'Poissonnerie de la Criée', rawCategory: 'fishmonger', category: 'grocery', rating: 4.5, reviewCount: 85, isOpenNow: true, photoUrl: PHOTO, description: 'Poisson frais.', distanceKm: 2.1 }),
  mk({ id: 'epicerie', name: 'Épicerie Vrac & Co', rawCategory: 'grocery_store', category: 'grocery', rating: 4.1, reviewCount: 48, isOpenNow: true, photoUrl: PHOTO, description: 'Zéro déchet, bio, local.', distanceKm: 3.2 }),
  mk({ id: 'producteur', name: 'La Ferme du Coteau', rawCategory: 'producer', category: 'producer', isProducer: true, rating: 4.6, reviewCount: 120, isOpenNow: true, photoUrl: PHOTO, description: 'Maraîcher bio, circuit court.', distanceKm: 8.5 }),
  mk({ id: 'fleuriste', name: 'Atelier Floral Lys', rawCategory: 'florist', category: 'shop', rating: 4.7, reviewCount: 40, isOpenNow: true, photoUrl: PHOTO, description: 'Fleurs de saison.', distanceKm: 4.4 }),
  mk({ id: 'librairie', name: 'Librairie des Arceaux', rawCategory: 'book_store', category: 'shop', rating: 4.8, reviewCount: 150, isOpenNow: true, photoUrl: PHOTO, description: 'Librairie indépendante.', distanceKm: 5.0 }),
  mk({ id: 'caviste', name: 'Cave des Vignerons', rawCategory: 'liquor_store', category: 'grocery', rating: 4.5, reviewCount: 75, isOpenNow: true, photoUrl: PHOTO, description: 'Vins locaux.', distanceKm: 6.3 }),
  mk({ id: 'fromagerie', name: 'Fromagerie du Peyrou', rawCategory: 'cheese_shop', category: 'grocery', rating: 4.6, reviewCount: 90, isOpenNow: true, photoUrl: PHOTO, description: 'Affinage artisanal.', distanceKm: 7.1 }),
];

/** Même corpus SANS distance : aucune position utilisateur. Le hors-intention alphabétiquement
 *  premier (« Agence Obsèques Aubert ») piégerait un tri par nom déguisé en proximité. */
const withoutGeo = () =>
  [
    mk({ id: 'obseques', name: 'Agence Obsèques Aubert', rawCategory: 'funeral_home', category: 'service', rating: 4.9, reviewCount: 25, isOpenNow: true, photoUrl: PHOTO, description: 'Obsèques.' }),
    ...withGeo().map(({ distanceKm: _ignored, ...rest }) => mk(rest as Merchant)),
  ];

const ids = (list: Merchant[]) => list.map((m) => m.id);

describe('buildHomeSections — primeur à la proximité (décision 13/07)', () => {
  it('« Autour de vous » = distances croissantes, sans ré-arbitrage éditorial', () => {
    const { nearby } = buildHomeSections(withGeo(), { limits: { nearby: 4 } });
    // Le primeur (0,15 km) ouvre la section ; les pompes funèbres (0,3 km, faible attrait
    // éditorial) restent 2e : en présence de distances réelles, SEULE la distance classe.
    expect(ids(nearby)).toEqual(['primeur', 'pompes', 'boulangerie', 'couvreur']);
  });

  it('tie-break stable par nom quand deux commerces sont à égale distance', () => {
    const twins = [
      mk({ id: 'b', name: 'Zinc & Zeste', category: 'grocery', distanceKm: 1.0 }),
      mk({ id: 'a', name: 'Atelier Gourmand', category: 'grocery', distanceKm: 1.0 }),
    ];
    const { nearby } = buildHomeSections(twins);
    expect(ids(nearby)).toEqual(['a', 'b']);
  });

  it('déduplication : aucun commerce ne figure dans deux sections', () => {
    const sections = buildHomeSections(withGeo(), {
      limits: { nearby: 4, recommendedToday: 4, toDiscover: 4 },
    });
    const all = [...sections.nearby, ...sections.recommendedToday, ...sections.toDiscover];
    expect(new Set(ids(all)).size).toBe(all.length);
  });

  it('exclusion en cascade : chaque section se sert APRÈS les précédentes', () => {
    const { nearby, recommendedToday, toDiscover } = buildHomeSections(withGeo(), {
      limits: { nearby: 4, recommendedToday: 4, toDiscover: 4 },
    });
    const usedByNearby = new Set(ids(nearby));
    for (const m of recommendedToday) expect(usedByNearby.has(m.id)).toBe(false);
    const usedByBoth = new Set([...ids(nearby), ...ids(recommendedToday)]);
    for (const m of toDiscover) expect(usedByBoth.has(m.id)).toBe(false);
  });

  it('repli sans géolocalisation : classement ÉDITORIAL (même moteur que le reste de l’app)', () => {
    const corpus = withoutGeo();
    const { nearby } = buildHomeSections(corpus, { limits: { nearby: 5 } });
    expect(ids(nearby)).toEqual(ids(rankMerchantsEditorially(corpus).slice(0, 5)));
  });

  it('ne présente JAMAIS un ordre alphabétique comme de la proximité', () => {
    const corpus = withoutGeo();
    const { nearby } = buildHomeSections(corpus, { limits: { nearby: 5 } });
    const alphabetical = ids([...corpus].sort((a, b) => a.name.localeCompare(b.name)).slice(0, 5));
    // Le piège alphabétique (« Agence Obsèques Aubert », hors-intention) n'ouvre pas la section.
    expect(nearby[0]!.id).not.toBe('obseques');
    expect(ids(nearby)).not.toEqual(alphabetical);
  });

  it('des distances toutes NaN/∞/absentes ne réactivent pas le tri « proximité »', () => {
    const corpus = withoutGeo().map((m, i) =>
      mk({ ...(m as object), id: m.id, name: m.name, distanceKm: [Number.NaN, Number.POSITIVE_INFINITY, undefined][i % 3] } as Partial<Merchant> & { id: string; name: string }),
    );
    const { nearby } = buildHomeSections(corpus, { limits: { nearby: 5 } });
    expect(ids(nearby)).toEqual(ids(rankMerchantsEditorially(corpus).slice(0, 5)));
  });
});

describe('hasRealDistances — test de domaine (NaN, ∞, absent, zéro)', () => {
  const one = (distanceKm: number | undefined) => [mk({ id: 'x', name: 'X', distanceKm })];

  it('faux sur corpus vide', () => {
    expect(hasRealDistances([])).toBe(false);
  });

  it('faux quand distanceKm est absent partout', () => {
    expect(hasRealDistances(one(undefined))).toBe(false);
  });

  it('faux pour NaN (une distance non calculable n’est pas une distance)', () => {
    expect(hasRealDistances(one(Number.NaN))).toBe(false);
  });

  it('faux pour Infinity (sentinelle de tri, pas une mesure)', () => {
    expect(hasRealDistances(one(Number.POSITIVE_INFINITY))).toBe(false);
  });

  it('vrai pour 0 km (sur place, distance réelle)', () => {
    expect(hasRealDistances(one(0))).toBe(true);
  });

  it('vrai dès qu’UNE distance finie existe dans le corpus', () => {
    const corpus = [...one(Number.NaN), mk({ id: 'y', name: 'Y', distanceKm: 0.4 })];
    expect(hasRealDistances(corpus)).toBe(true);
  });
});
