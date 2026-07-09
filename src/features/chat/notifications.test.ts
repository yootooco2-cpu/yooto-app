import { buildFeedNotifications, notifTime } from './notifications';
import type { ActivityItem } from './types';

const base = (over: Partial<ActivityItem>): ActivityItem => ({
  id: 'x', kind: 'arrivage', source: 'member', emoji: '🥖', authorId: 'a',
  title: 'Titre', categoryId: 'vie-locale', createdAt: new Date(0).toISOString(), ...over,
});

const NOW = 1_000 * 60 * 60 * 24 * 10; // t0 arbitraire

describe('notifTime', () => {
  it('formate le temps écoulé façon réseau social', () => {
    expect(notifTime(new Date(NOW - 10_000).toISOString(), NOW)).toBe("À l'instant");
    expect(notifTime(new Date(NOW - 8 * 60_000).toISOString(), NOW)).toBe('Il y a 8 min');
    expect(notifTime(new Date(NOW - 2 * 3_600_000).toISOString(), NOW)).toBe('Il y a 2 h');
    expect(notifTime(new Date(NOW - 3 * 86_400_000).toISOString(), NOW)).toBe('Il y a 3 j');
  });
});

describe('buildFeedNotifications', () => {
  it('priorise les publications des commerces suivis', () => {
    const items = [
      base({ id: 'p1', authorId: 'shop', createdAt: new Date(NOW - 5 * 3_600_000).toISOString() }),
      base({ id: 'p2', authorId: 'reco', createdAt: new Date(NOW - 60_000).toISOString(), geo: { distanceKm: 0.2 } }),
    ];
    const out = buildFeedNotifications(items, { shop: true }, NOW);
    expect(out[0].id).toBe('p1'); // suivi passe devant, même plus ancien et plus loin
  });

  it('mappe chaque notification vers son cryptogramme et son message', () => {
    const out = buildFeedNotifications([base({ id: 'p', kind: 'offre', title: 'Offre du jour' })], {}, NOW, 1);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ id: 'p', crypto: 'offre', message: 'Offre du jour' });
  });

  it('limite le nombre de notifications', () => {
    const items = Array.from({ length: 12 }, (_, i) => base({ id: `p${i}` }));
    expect(buildFeedNotifications(items, {}, NOW, 4)).toHaveLength(4);
  });
});
