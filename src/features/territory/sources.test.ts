import { recentlyOpenedSource } from './sources';
import type { Merchant } from '@/features/merchants';

const NOW = Date.parse('2026-07-11T12:00:00Z');
const m = (id: string, created?: string): Merchant =>
  ({
    id,
    name: id,
    category: 'grocery',
    description: '',
    coordinates: { latitude: 43.6, longitude: 3.87 },
    distanceLabel: '—',
    isOpenNow: false,
    isProducer: false,
    isAccessible: false,
    hasRewards: false,
    pin: { x: 0, y: 0 },
    sireneCreationDate: created,
  }) as Merchant;

describe('recentlyOpenedSource — uniquement du réel, ordonné du plus récent', () => {
  it('sélectionne les créations < 180 j, les plus récentes d’abord', () => {
    const out = recentlyOpenedSource.select(
      [m('vieux', '2024-01-01'), m('avril', '2026-04-07'), m('janvier', '2026-01-15'), m('sans-date')],
      { now: NOW },
    );
    expect(out.map((x) => x.id)).toEqual(['avril', 'janvier']);
  });

  it('sans date SIRENE → jamais présent (aucune donnée inventée)', () => {
    expect(recentlyOpenedSource.select([m('a'), m('b')], { now: NOW })).toEqual([]);
  });

  it('plafonne à 10 (un carrousel se parcourt)', () => {
    const many = Array.from({ length: 15 }, (_, i) => m(`x${i}`, '2026-06-01'));
    expect(recentlyOpenedSource.select(many, { now: NOW })).toHaveLength(10);
  });
});
