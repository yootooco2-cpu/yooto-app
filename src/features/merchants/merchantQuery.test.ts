/// <reference types="jest" />
import { applyMerchantQueryLocal } from './merchantQuery';
import type { Merchant } from './types';

function mk(over: Partial<Merchant>): Merchant {
  return {
    id: over.id ?? 'x',
    name: over.name ?? 'Commerce',
    category: over.category ?? 'shop',
    description: over.description ?? '',
    coordinates: over.coordinates ?? { latitude: 43.6, longitude: 3.87 },
    distanceLabel: '—',
    isOpenNow: over.isOpenNow ?? false,
    isProducer: over.isProducer ?? false,
    isAccessible: false,
    hasRewards: false,
    pin: { x: 0, y: 0 },
    ...over,
  };
}

const CAFE = mk({ id: 'cafe', name: 'Café des Arts', category: 'restaurant' });
const BOUL = mk({ id: 'boul', name: 'Boulangerie Voisin', category: 'shop' });
const FERME = mk({ id: 'ferme', name: 'La Ferme du Coteau', category: 'producer', isProducer: true });

const ALL = [CAFE, BOUL, FERME];

describe('applyMerchantQueryLocal — filtrage instantané en mémoire', () => {
  it('requête vide → tout le corpus', () => {
    expect(applyMerchantQueryLocal(ALL, undefined)).toHaveLength(3);
    expect(applyMerchantQueryLocal(ALL, { search: '' })).toHaveLength(3);
  });

  it('recherche insensible aux accents : « cafe » retrouve « Café des Arts »', () => {
    const res = applyMerchantQueryLocal(ALL, { search: 'cafe' });
    expect(res.map((m) => m.id)).toEqual(['cafe']);
  });

  it('recherche par sous-chaîne (nom)', () => {
    expect(applyMerchantQueryLocal(ALL, { search: 'voisin' }).map((m) => m.id)).toEqual(['boul']);
  });

  it('filtre « producers » ne garde que les producteurs', () => {
    const res = applyMerchantQueryLocal(ALL, { filters: ['producers'] });
    expect(res.map((m) => m.id)).toEqual(['ferme']);
  });

  it('recherche sans correspondance → aucun résultat', () => {
    expect(applyMerchantQueryLocal(ALL, { search: 'zzzz' })).toHaveLength(0);
  });

  it('combine recherche + filtre', () => {
    // « ferme » (producteur) mais filtre restaurant-only via absence → ici filtre producers.
    const res = applyMerchantQueryLocal(ALL, { search: 'ferme', filters: ['producers'] });
    expect(res.map((m) => m.id)).toEqual(['ferme']);
  });
});
