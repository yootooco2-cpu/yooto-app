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
    expect(alim?.match(merchant({ isProducer: true, category: 'producer' }))).toBe(true);
  });

  it('réutilise le match d’une catégorie existante pour la sous-catégorie (aucune duplication)', () => {
    const alim = categoryFamilyById('alimentation');
    const producteurs = alim?.items.find((i) => i.id === 'producteurs');
    expect(producteurs?.match(merchant({ isProducer: true }))).toBe(true);
  });

  it('chaque famille a au moins une sous-catégorie', () => {
    expect(CATEGORY_FAMILIES.every((f) => f.items.length > 0)).toBe(true);
  });

  it('les sous-catégories Alimentation portent leur pictogramme (cryptogramme existant)', () => {
    const alim = categoryFamilyById('alimentation');
    expect(alim?.items.length).toBe(11);
    expect(alim?.items.every((i) => i.iconId !== undefined)).toBe(true);
  });

  it('Artisanat = métiers d’art (ébénistes, luthiers…) reconnus par le métier, pas les boutiques', () => {
    const art = categoryFamilyById('artisanat');
    const labels = art?.items.map((i) => i.label) ?? [];
    expect(labels).toContain('Ébénistes');
    expect(labels).toContain('Luthiers');
    expect(labels).toContain('Souffleurs de verre');
    expect(labels.length).toBeGreaterThanOrEqual(40);

    const ebenistes = art?.items.find((i) => i.id === 'ebenistes');
    expect(ebenistes?.match(merchant({ name: 'Atelier d’ébénisterie du Peyrou' }))).toBe(true);
    expect(art?.match(merchant({ name: 'Luthier — guitares & violons' }))).toBe(true);
    // Un commerce classique n'est PAS un métier d'art.
    expect(art?.match(merchant({ name: 'Supermarché Casino', rawCategory: 'supermarket' }))).toBe(false);
  });
});
