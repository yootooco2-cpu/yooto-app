/// <reference types="jest" />
import { aggregate, contextualRelevance, editorialGate, FLOOR } from './aggregate';
import type { SignalContribution } from './types';

// Contribution additive (mode par défaut, comme tous les signaux existants).
const add = (key: string, weight: number, value: number): SignalContribution => ({
  key: key as SignalContribution['key'],
  weight,
  value,
});

// « Vérité terrain » = agrégateur ACTUEL (moyenne pondérée) avant Sprint 1.
function legacyWeightedAverage(contributions: SignalContribution[]): number {
  const totalWeight = contributions.reduce((acc, c) => acc + c.weight, 0);
  const weighted = contributions.reduce((acc, c) => acc + c.weight * c.value, 0);
  return totalWeight > 0 ? weighted / totalWeight : 0;
}

// Jeux de contributions (uniquement additifs) représentatifs des signaux réels YOOTOO.
const FIXTURES: { id: string; contributions: SignalContribution[] }[] = [
  { id: 'proche+notée+ouverte', contributions: [add('distance', 1.5, 0.9), add('rating', 1.2, 0.92), add('openNow', 1, 1)] },
  { id: 'loin+bien notée', contributions: [add('distance', 1.5, 0.4), add('rating', 1.2, 0.88), add('openNow', 1, 1)] },
  { id: 'très proche, sans note', contributions: [add('distance', 1.5, 0.97), add('openNow', 1, 0.2)] },
  { id: 'producteur saison', contributions: [add('distance', 1.5, 0.6), add('producer', 0.8, 1), add('season', 0.4, 0.8)] },
  { id: 'un seul signal faible', contributions: [add('openNow', 1, 0.2)] },
  { id: 'un seul signal fort', contributions: [add('rating', 1.2, 1)] },
  { id: 'tout à zéro', contributions: [add('distance', 1.5, 0), add('openNow', 1, 0)] },
  { id: 'aucun signal', contributions: [] },
  { id: 'moyen', contributions: [add('distance', 1.5, 0.5), add('rating', 1.2, 0.5)] },
];

function orderOf(score: (c: SignalContribution[]) => number): string[] {
  return [...FIXTURES]
    .map((f, i) => ({ id: f.id, s: score(f.contributions), i }))
    // Tri décroissant, départage STABLE par index d'origine (comme un tri stable).
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.id);
}

describe('aggregate v2 — non-régression de l\'ordre (signaux additifs uniquement)', () => {
  it('produit EXACTEMENT le même ordre que la moyenne pondérée historique', () => {
    expect(orderOf(aggregate)).toEqual(orderOf(legacyWeightedAverage));
  });

  it('est une transformation strictement croissante de la moyenne (préserve les rangs)', () => {
    for (const f of FIXTURES) {
      const avg = legacyWeightedAverage(f.contributions);
      const v2 = aggregate(f.contributions);
      // gate = 1 (aucun multiplicatif) → v2 = FLOOR + (1-FLOOR)·avg.
      expect(v2).toBeCloseTo(FLOOR + (1 - FLOOR) * avg, 10);
    }
  });

  it('conserve strictement l\'ordre pour toute paire (a < b ⇒ v2(a) < v2(b))', () => {
    for (const a of FIXTURES) {
      for (const b of FIXTURES) {
        const avgA = legacyWeightedAverage(a.contributions);
        const avgB = legacyWeightedAverage(b.contributions);
        if (avgA < avgB) {
          expect(aggregate(a.contributions)).toBeLessThan(aggregate(b.contributions));
        }
      }
    }
  });
});

describe('aggregate v2 — familles de signaux', () => {
  it('sans signal multiplicatif, gate = 1 (neutre)', () => {
    expect(editorialGate(FIXTURES[0].contributions)).toBe(1);
  });

  it('un signal multiplicatif < 1 rétrograde le score (gate éditorial)', () => {
    const additifs: SignalContribution[] = [add('distance', 1.5, 0.9), add('rating', 1.2, 0.9)];
    const gated: SignalContribution[] = [
      ...additifs,
      { key: 'category' as SignalContribution['key'], weight: 0, value: 0.12, mode: 'multiplicative' },
    ];
    expect(aggregate(gated)).toBeLessThan(aggregate(additifs));
    // Le gate n'entre PAS dans la moyenne pondérée (n'altère pas la pertinence contextuelle).
    expect(contextualRelevance(gated)).toBeCloseTo(contextualRelevance(additifs), 10);
  });

  it('un gate multiplicatif = 1 laisse le score inchangé', () => {
    const additifs: SignalContribution[] = [add('distance', 1.5, 0.7)];
    const neutre: SignalContribution[] = [
      ...additifs,
      { key: 'category' as SignalContribution['key'], weight: 0, value: 1, mode: 'multiplicative' },
    ];
    expect(aggregate(neutre)).toBeCloseTo(aggregate(additifs), 10);
  });
});
