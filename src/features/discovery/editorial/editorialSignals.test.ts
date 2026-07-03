/// <reference types="jest" />
import type { Merchant } from '@/features/merchants/types';

import { aggregate } from '../aggregate';
import type { DiscoveryContext, SignalContribution } from '../types';
import { editorialSignals } from './editorialSignals';

// Le seul signal éditorial du Sprint 2.
const categorySignal = editorialSignals[0];

// Contexte minimal : categorySignal ne lit QUE ctx.extras.rankingV2 → isolation totale
// (aucun import de context.ts / cache.ts, donc aucune dépendance React Native).
function ctxWith(rankingV2: boolean): DiscoveryContext {
  return { extras: { rankingV2 } } as unknown as DiscoveryContext;
}

function mk(partial: Partial<Merchant>): Merchant {
  return {
    id: partial.id ?? 'x',
    name: partial.name ?? 'Commerce',
    category: partial.category ?? 'shop',
    description: partial.description ?? '',
    coordinates: { latitude: 43.6, longitude: 3.87 },
    distanceLabel: '—',
    isOpenNow: false,
    isProducer: false,
    isAccessible: false,
    hasRewards: false,
    pin: { x: 0, y: 0 },
    ...partial,
  };
}

const CAFE = mk({ id: 'cafe', name: 'Le Comptoir', rawCategory: 'cafe' });
const COUVREUR = mk({ id: 'couv', name: 'Toitures Martin', rawCategory: 'roofing_contractor' });
const CHATTERIE = mk({ id: 'chat', name: 'Refuge Félin', rawCategory: 'cattery' });

const add = (key: string, weight: number, value: number): SignalContribution => ({
  key: key as SignalContribution['key'],
  weight,
  value,
});

// Même contexte additif pour les trois → isole l'effet du gate de catégorie.
const SAME_CONTEXT: SignalContribution[] = [add('distance', 1.5, 0.9), add('rating', 1.2, 0.9), add('openNow', 1, 1)];

function scoreWithGate(m: Merchant, rankingV2: boolean): number {
  const cat = categorySignal(m, ctxWith(rankingV2));
  return aggregate(cat ? [...SAME_CONTEXT, cat] : [...SAME_CONTEXT]);
}

describe('categorySignal — Feature Flag rankingV2', () => {
  it('flag OFF → renvoie null (no-op) pour toute catégorie', () => {
    for (const m of [CAFE, COUVREUR, CHATTERIE]) {
      expect(categorySignal(m, ctxWith(false))).toBeNull();
    }
  });

  it('flag ON → contribution multiplicative = prior de tier', () => {
    expect(categorySignal(CAFE, ctxWith(true))).toEqual({ key: 'category', weight: 0, value: 1.0, mode: 'multiplicative' });
    expect(categorySignal(COUVREUR, ctxWith(true))).toEqual({ key: 'category', weight: 0, value: 0.35, mode: 'multiplicative' });
    expect(categorySignal(CHATTERIE, ctxWith(true))).toEqual({ key: 'category', weight: 0, value: 0.12, mode: 'multiplicative' });
  });

  it('n\'émet AUCUNE reason (pas de fuite « rétrogradé » vers l\'UI)', () => {
    expect(categorySignal(CHATTERIE, ctxWith(true))?.reason).toBeUndefined();
  });
});

describe('A/B — flag OFF = comportement inchangé', () => {
  it('à contexte égal, les trois catégories obtiennent le MÊME score (gate absent)', () => {
    const sCafe = scoreWithGate(CAFE, false);
    const sCouv = scoreWithGate(COUVREUR, false);
    const sChat = scoreWithGate(CHATTERIE, false);
    expect(sCafe).toBe(sCouv);
    expect(sCouv).toBe(sChat);
  });
});

describe('A/B — flag ON = ordre corrigé', () => {
  it('golden : café > couvreur > chatterie (à contexte égal)', () => {
    const sCafe = scoreWithGate(CAFE, true);
    const sCouv = scoreWithGate(COUVREUR, true);
    const sChat = scoreWithGate(CHATTERIE, true);
    expect(sCafe).toBeGreaterThan(sCouv);
    expect(sCouv).toBeGreaterThan(sChat);
  });

  it('invariant de tier : une chatterie au contexte PARFAIT reste sous un café au contexte médiocre', () => {
    const catCafe = categorySignal(CAFE, ctxWith(true));
    const catChat = categorySignal(CHATTERIE, ctxWith(true));
    // Café : contexte médiocre (loin, pas d'autre signal). Chatterie : contexte parfait.
    const sCafe = aggregate([add('distance', 1.5, 0.3), ...(catCafe ? [catCafe] : [])]);
    const sChat = aggregate([
      add('distance', 1.5, 1.0),
      add('rating', 1.2, 1.0),
      add('openNow', 1, 1),
      ...(catChat ? [catChat] : []),
    ]);
    expect(sCafe).toBeGreaterThan(sChat);
  });
});
