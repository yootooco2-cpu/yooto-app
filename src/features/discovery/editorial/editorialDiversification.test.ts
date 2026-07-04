/// <reference types="jest" />
import type { Merchant } from '@/features/merchants/types';

import { editorialDiversification, getMerchantEditorialScore } from './editorialScore';

// La diversification est une couche LÉGÈRE sur la vitrine : elle réordonne les premières cartes
// pour éviter un mur d'une même famille, SANS jamais remonter un commerce moins bon. Ici on
// contrôle la « famille » via familyOf (déterministe, indépendant des cryptogrammes).

const PHOTO = 'https://images.example.com/real.jpg';
// Score ≈ tier max(30) + photo(60) + open(6) + note ⇒ ~ maîtrisé via la note pour ordonner.
const mk = (name: string, fam: string, rating: number): Merchant =>
  ({ id: name, name, rawCategory: 'vineyard', rating, reviewCount: 30, isOpenNow: true, photoUrl: PHOTO, description: fam } as unknown as Merchant);

const famOf = (m: Merchant) => (m.description ?? '') as string;

describe('editorialDiversification — vitrine légère', () => {
  it('évite plus de 2 commerces consécutifs d’une même famille (alternative excellente dispo)', () => {
    // 5 « vin » très proches + 2 autres familles dans la bande.
    const list = [
      mk('vin1', 'vin', 4.9),
      mk('vin2', 'vin', 4.9),
      mk('vin3', 'vin', 4.8),
      mk('pain1', 'pain', 4.8),
      mk('vin4', 'vin', 4.8),
      mk('fromage1', 'fromage', 4.7),
      mk('vin5', 'vin', 4.7),
    ];
    const out = editorialDiversification(list, { window: 7, maxRun: 2, familyOf: famOf });
    // Aucune séquence de 3 mêmes familles consécutives sur la fenêtre.
    for (let i = 0; i + 2 < out.length; i++) {
      const run = famOf(out[i]) === famOf(out[i + 1]) && famOf(out[i + 1]) === famOf(out[i + 2]);
      expect(run).toBe(false);
    }
  });

  it('ne remonte JAMAIS un commerce hors bande d’excellence pour varier', () => {
    // 4 « vin » excellents + 1 « pain » MÉDIOCRE (note très basse → hors bande).
    const list = [
      mk('vin1', 'vin', 4.9),
      mk('vin2', 'vin', 4.9),
      mk('vin3', 'vin', 4.9),
      mk('vin4', 'vin', 4.9),
      mk('painMediocre', 'pain', 1.0),
    ];
    const out = editorialDiversification(list, { window: 5, maxRun: 2, band: 20, familyOf: famOf });
    // Le pain médiocre n'est pas remonté : il reste dernier (run de vin conservé, qualité prime).
    expect(out[out.length - 1].name).toBe('painMediocre');
    expect(famOf(out[0])).toBe('vin');
  });

  it('conserve l’ordre éditorial exact au-delà de la fenêtre (annuaire profond intact)', () => {
    const list = Array.from({ length: 20 }, (_, i) => mk(`m${i}`, i % 2 ? 'a' : 'b', 4.5 - i * 0.01));
    const out = editorialDiversification(list, { window: 4, maxRun: 2, familyOf: famOf });
    // Les IDs présents après la fenêtre suivent l'ordre d'origine (sous-suite préservée).
    const tail = out.slice(4).map((m) => m.name);
    const orig = list.map((m) => m.name).filter((n) => tail.includes(n));
    expect(tail).toEqual(orig);
  });

  it('ne supprime aucun commerce (même ensemble, même taille)', () => {
    const list = [mk('a', 'x', 4.9), mk('b', 'x', 4.8), mk('c', 'y', 4.7), mk('d', 'x', 4.6)];
    const out = editorialDiversification(list, { window: 4, familyOf: famOf });
    expect(out).toHaveLength(list.length);
    expect(new Set(out.map((m) => m.name))).toEqual(new Set(list.map((m) => m.name)));
  });

  it('déterministe (aucun hasard) : deux appels identiques → même ordre', () => {
    const list = [mk('a', 'x', 4.9), mk('b', 'x', 4.9), mk('c', 'y', 4.8), mk('d', 'x', 4.8), mk('e', 'z', 4.7)];
    const a = editorialDiversification(list, { window: 5, familyOf: famOf }).map((m) => m.name);
    const b = editorialDiversification(list, { window: 5, familyOf: famOf }).map((m) => m.name);
    expect(a).toEqual(b);
  });

  it('sans alternative (une seule famille) : ordre par score inchangé', () => {
    const list = [mk('v1', 'vin', 4.9), mk('v2', 'vin', 4.8), mk('v3', 'vin', 4.7)];
    const out = editorialDiversification(list, { window: 3, familyOf: famOf }).map((m) => m.name);
    expect(out).toEqual(['v1', 'v2', 'v3']);
  });

  it('la carte de tête reste le meilleur score (pas de dégradation du #1)', () => {
    const list = [mk('best', 'vin', 5.0), mk('vin2', 'vin', 4.9), mk('pain', 'pain', 4.8)];
    const out = editorialDiversification(list, { window: 3, familyOf: famOf });
    expect(out[0].name).toBe('best');
    expect(getMerchantEditorialScore(out[0])).toBeGreaterThanOrEqual(getMerchantEditorialScore(out[1]));
  });
});
