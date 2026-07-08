import { CATEGORY_FAMILIES, categoryFamilyById } from './categoryFamilies';
import type { Merchant } from './types';

const merchant = (over: Partial<Merchant>): Merchant =>
  ({
    id: '1',
    name: '',
    category: 'shop',
    description: '',
    coordinates: { latitude: 0, longitude: 0 },
    distanceLabel: '—',
    isOpenNow: false,
    isProducer: false,
    isAccessible: false,
    hasRewards: false,
    pin: { x: 0, y: 0 },
    ...over,
  }) as Merchant;

describe('categoryFamilies', () => {
  it('expose les 7 grandes familles (Niveau 1) dans l’ordre de la référence', () => {
    expect(CATEGORY_FAMILIES.map((f) => f.label)).toEqual([
      'Alimentation',
      'Restaurants',
      'Bien-être',
      'Artisanat',
      'Culture',
      'Mobilité',
      'Plus',
    ]);
  });

  it('regroupe les catégories existantes (union de match) — un producteur ∈ Alimentation', () => {
    const alim = categoryFamilyById('alimentation');
    expect(alim?.match?.(merchant({ isProducer: true, category: 'producer' }))).toBe(true);
  });

  it('réutilise le match d’une catégorie existante pour la sous-catégorie (aucune duplication)', () => {
    const alim = categoryFamilyById('alimentation');
    const producteurs = alim?.children?.find((i) => i.id === 'producteurs');
    expect(producteurs?.match?.(merchant({ isProducer: true }))).toBe(true);
  });

  it('chaque grande famille est une branche (a des enfants)', () => {
    expect(CATEGORY_FAMILIES.every((f) => (f.children?.length ?? 0) > 0)).toBe(true);
  });

  it('les sous-catégories Alimentation portent leur pictogramme (cryptogramme existant)', () => {
    const alim = categoryFamilyById('alimentation');
    expect(alim?.children?.length).toBe(11);
    expect(alim?.children?.every((i) => i.iconId !== undefined)).toBe(true);
  });

  it('Bien-être = 8 métiers, chacun avec pictogramme dédié + couleur d’accent', () => {
    const be = categoryFamilyById('bienetre');
    expect(be?.children?.length).toBe(8);
    expect(be?.children?.map((i) => i.id)).toEqual([
      'spa-hammam', 'fitness', 'yoga', 'pilates', 'coaching-sportif', 'naturopathie', 'tatoueur', 'perceur',
    ]);
    expect(be?.children?.every((i) => i.pictoKey && /^#[0-9A-F]{6}$/i.test(i.accent ?? ''))).toBe(true);
    const naturo = be?.children?.find((i) => i.id === 'naturopathie');
    expect(naturo?.match?.(merchant({ name: 'Cabinet de naturopathie Sainte-Anne' }))).toBe(true);
  });

  it('Restaurants = 13 sous-catégories, chacune avec pictogramme dédié + couleur d’accent', () => {
    const resto = categoryFamilyById('restaurants');
    expect(resto?.children?.length).toBe(13);
    expect(resto?.children?.every((i) => i.pictoKey && /^#[0-9A-F]{6}$/i.test(i.accent ?? ''))).toBe(true);
  });

  it('Artisanat = navigation à 3 niveaux : 11 familles (badge + accent) → métiers', () => {
    const art = categoryFamilyById('artisanat');
    // Niveau 2 : 11 familles, chacune avec pictogramme dédié + accent + enfants (métiers).
    expect(art?.children?.length).toBe(11);
    expect(art?.children?.map((f) => f.label)).toEqual([
      'Art du bois', 'Art du métal', 'Art de la pierre', 'Terre & Céramique', 'Textile & Cuir',
      'Bijouterie & Joaillerie', 'Verre & Vitrail', 'Arts décoratifs', 'Restauration & Patrimoine',
      'Art de la table', 'Créations artisanales',
    ]);
    expect(art?.children?.every((f) => f.pictoKey && /^#[0-9A-F]{6}$/i.test(f.accent ?? '') && (f.children?.length ?? 0) > 0)).toBe(true);

    // Niveau 3 : métiers de « Art du bois » incluent Ébéniste, qui reconnaît un ébéniste.
    const bois = art?.children?.find((f) => f.id === 'art-du-bois');
    const ebeniste = bois?.children?.find((m) => m.id === 'ebeniste');
    expect(ebeniste?.match?.(merchant({ name: 'Atelier d’ébénisterie du Peyrou' }))).toBe(true);
    // Union famille : un luthier ∈ Art du bois.
    expect(bois?.match?.(merchant({ name: 'Luthier — guitares & violons' }))).toBe(true);
    // Un commerce classique n'est PAS un artisan.
    expect(art?.match?.(merchant({ name: 'Supermarché Casino', rawCategory: 'supermarket' }))).toBe(false);
  });
});
