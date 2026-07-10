import { rankTopCategoryMerchants } from './topCategory';
import type { Merchant } from './types';

/** Fabrique minimale — seuls les champs du classement varient. */
const merchant = (id: string, over: Partial<Merchant>): Merchant =>
  ({
    id,
    name: id,
    category: 'restaurant',
    description: '',
    coordinates: { latitude: 43.6, longitude: 3.87 },
    distanceLabel: '—',
    isOpenNow: true,
    isProducer: false,
    isAccessible: false,
    hasRewards: false,
    pin: { x: 0, y: 0 },
    ...over,
  }) as Merchant;

describe('rankTopCategoryMerchants — cascade de priorités', () => {
  it('1. un partenaire YOOTOO passe devant tout, même moins bien noté', () => {
    const ranked = rankTopCategoryMerchants([
      merchant('top-note', { rating: 4.9, reviewCount: 900 }),
      merchant('partenaire', { hasRewards: true, rating: 4.1 }),
    ]);
    expect(ranked.map((m) => m.id)).toEqual(['partenaire', 'top-note']);
  });

  it('2. à partenariat égal, le score local tranche', () => {
    const ranked = rankTopCategoryMerchants([
      merchant('b', { localScore: 60, rating: 5 }),
      merchant('a', { localScore: 80, rating: 3 }),
    ]);
    expect(ranked[0].id).toBe('a');
  });

  it('3-4. puis note Google, puis nombre d’avis', () => {
    const ranked = rankTopCategoryMerchants([
      merchant('peu-avis', { rating: 4.5, reviewCount: 12 }),
      merchant('mieux-note', { rating: 4.8, reviewCount: 12 }),
      merchant('plus-avis', { rating: 4.5, reviewCount: 400 }),
    ]);
    expect(ranked.map((m) => m.id)).toEqual(['mieux-note', 'plus-avis', 'peu-avis']);
  });

  it('5. à égalité parfaite, le plus proche gagne ; distance inconnue reléguée', () => {
    const ranked = rankTopCategoryMerchants([
      merchant('inconnu', {}),
      merchant('loin', { distanceKm: 3.2 }),
      merchant('proche', { distanceKm: 0.4 }),
    ]);
    expect(ranked.map((m) => m.id)).toEqual(['proche', 'loin', 'inconnu']);
  });

  it('respecte la limite et ne mute pas l’entrée', () => {
    const input = [merchant('a', {}), merchant('b', { hasRewards: true }), merchant('c', {})];
    const snapshot = input.map((m) => m.id);
    expect(rankTopCategoryMerchants(input, 2)).toHaveLength(2);
    expect(input.map((m) => m.id)).toEqual(snapshot);
  });
});
