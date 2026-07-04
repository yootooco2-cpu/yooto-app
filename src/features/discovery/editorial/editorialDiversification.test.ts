/// <reference types="jest" />
import type { Merchant } from '@/features/merchants/types';

import { editorialDiversification, getMerchantEditorialScore } from './editorialScore';

// Diversification en ROUND-ROBIN par famille sur la vitrine : le meilleur de CHAQUE famille
// d'abord (variété « marché local »), jamais 2 mêmes familles d'affilée, en ne piochant QUE dans
// la bande d'excellence (jamais un commerce moins bon). `familyOf` contrôlé pour un test déterministe.

const PHOTO = 'https://images.example.com/real.jpg';
const mk = (name: string, fam: string, rating: number): Merchant =>
  ({ id: name, name, rawCategory: 'vineyard', rating, reviewCount: 30, isOpenNow: true, photoUrl: PHOTO, description: fam } as unknown as Merchant);
const famOf = (m: Merchant) => (m.description ?? '') as string;

describe('editorialDiversification — round-robin vitrine', () => {
  const list = [
    mk('vin1', 'vin', 4.9),
    mk('vin2', 'vin', 4.88),
    mk('vin3', 'vin', 4.86),
    mk('pain1', 'pain', 4.7),
    mk('pain2', 'pain', 4.68),
    mk('fromage1', 'fromage', 4.6),
  ];

  it('les premières cartes montrent le meilleur de CHAQUE famille (variété)', () => {
    const out = editorialDiversification(list, { window: 6, familyOf: famOf });
    // 3 premières familles distinctes (vin, pain, fromage).
    expect(new Set([famOf(out[0]), famOf(out[1]), famOf(out[2])]).size).toBe(3);
  });

  it('jamais 2 commerces consécutifs de la même famille', () => {
    const out = editorialDiversification(list, { window: 6, familyOf: famOf });
    for (let i = 0; i + 1 < out.length; i++) {
      expect(famOf(out[i]) === famOf(out[i + 1])).toBe(false);
    }
  });

  it('la carte de tête reste le meilleur score', () => {
    const out = editorialDiversification(list, { window: 6, familyOf: famOf });
    expect(out[0].name).toBe('vin1');
    expect(getMerchantEditorialScore(out[0])).toBeGreaterThanOrEqual(getMerchantEditorialScore(out[1]));
  });

  it('ne remonte JAMAIS un commerce hors bande d’excellence pour varier', () => {
    const withMediocre = [
      mk('vin1', 'vin', 4.9),
      mk('vin2', 'vin', 4.9),
      mk('vin3', 'vin', 4.9),
      mk('painMediocre', 'pain', 1.0), // note très basse → hors bande
    ];
    const out = editorialDiversification(withMediocre, { window: 4, band: 20, familyOf: famOf });
    // Le pain médiocre n'est pas remonté pour créer de la variété : il reste dernier.
    expect(out[out.length - 1].name).toBe('painMediocre');
    expect(famOf(out[0])).toBe('vin');
  });

  it('conserve l’ordre éditorial exact au-delà de la fenêtre (annuaire profond intact)', () => {
    const many = Array.from({ length: 20 }, (_, i) => mk(`m${i}`, `f${i % 3}`, 4.9 - i * 0.05));
    const out = editorialDiversification(many, { window: 4, familyOf: famOf });
    const tailNames = out.slice(4).map((m) => m.name);
    const origTail = many.map((m) => m.name).filter((n) => tailNames.includes(n));
    expect(tailNames).toEqual(origTail);
  });

  it('ne supprime aucun commerce (même ensemble, même taille)', () => {
    const out = editorialDiversification(list, { window: 6, familyOf: famOf });
    expect(out).toHaveLength(list.length);
    expect(new Set(out.map((m) => m.name))).toEqual(new Set(list.map((m) => m.name)));
  });

  it('déterministe (aucun hasard) : deux appels identiques → même ordre', () => {
    const a = editorialDiversification(list, { window: 6, familyOf: famOf }).map((m) => m.name);
    const b = editorialDiversification(list, { window: 6, familyOf: famOf }).map((m) => m.name);
    expect(a).toEqual(b);
  });

  it('une seule famille : ordre par score inchangé', () => {
    const mono = [mk('v1', 'vin', 4.9), mk('v2', 'vin', 4.8), mk('v3', 'vin', 4.7)];
    const out = editorialDiversification(mono, { window: 3, familyOf: famOf }).map((m) => m.name);
    expect(out).toEqual(['v1', 'v2', 'v3']);
  });
});
