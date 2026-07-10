import { feedScore, isPartnerAuthor, rankFeed, type FeedRankContext } from './feedRanking';
import type { ActivityItem, ChatParticipant } from './types';

const NOW = Date.parse('2026-07-09T12:00:00Z');
const iso = (minAgo: number) => new Date(NOW - minAgo * 60_000).toISOString();

const item = (id: string, over: Partial<ActivityItem>): ActivityItem => ({
  id,
  kind: 'annonce',
  source: 'member',
  emoji: '📣',
  authorId: 'pro_x',
  title: id,
  createdAt: iso(30),
  ...over,
});

const pro = (over: Partial<ChatParticipant>): ChatParticipant =>
  ({ id: 'pro_x', kind: 'commercant', name: 'X', ...over }) as ChatParticipant;

const ctx = (over: Partial<FeedRankContext> = {}): FeedRankContext => ({
  following: {},
  now: NOW,
  participants: { pro_x: pro({}) },
  ...over,
});

describe('rankFeed — priorités du fil social', () => {
  it('1. la proximité domine : tout proche bat suivi lointain', () => {
    const ranked = rankFeed(
      [
        item('suivi-loin', { authorId: 'pro_far', geo: { distanceKm: 12 } as never }),
        item('inconnu-proche', { geo: { distanceKm: 0.3 } as never }),
      ],
      ctx({ following: { pro_far: true }, participants: { pro_x: pro({}), pro_far: pro({ id: 'pro_far' }) } }),
    );
    expect(ranked[0].id).toBe('inconnu-proche');
  });

  it('2. à distance égale, un commerce suivi passe devant', () => {
    const g = { distanceKm: 0.5 } as never;
    const ranked = rankFeed(
      [item('autre', { authorId: 'pro_b', geo: g }), item('suivi', { authorId: 'pro_a', geo: g })],
      ctx({
        following: { pro_a: true },
        participants: { pro_a: pro({ id: 'pro_a' }), pro_b: pro({ id: 'pro_b' }) },
      }),
    );
    expect(ranked[0].id).toBe('suivi');
  });

  it('3. la récence compte : publication fraîche > publication de 3 jours', () => {
    const ranked = rankFeed([item('vieux', { createdAt: iso(70 * 60) }), item('frais', { createdAt: iso(10) })], ctx());
    expect(ranked[0].id).toBe('frais');
  });

  it('4. le badge partenaire ajoute, sans écraser la proximité', () => {
    const partner = pro({ id: 'pro_p', badges: [{ kind: 'verified_pro', label: 'Pro vérifié' }] });
    expect(isPartnerAuthor(partner)).toBe(true);
    const near = item('proche', { geo: { distanceKm: 0.3 } as never });
    const far = item('partenaire-loin', { authorId: 'pro_p', geo: { distanceKm: 12 } as never });
    const c = ctx({ participants: { pro_x: pro({}), pro_p: partner } });
    expect(feedScore(near, c)).toBeGreaterThan(feedScore(far, c));
  });

  it('5. l’engagement départage, plafonné (utilité > popularité)', () => {
    const a = item('calme', {});
    const b = item('anime', { reactions: [{ emoji: '👍', count: 20 }] });
    const c = item('viral', { reactions: [{ emoji: '👍', count: 900 }] });
    const context = ctx({ commentCounts: { anime: 4 } });
    expect(feedScore(b, context)).toBeGreaterThan(feedScore(a, context));
    // Plafond : 900 réactions ne rapportent pas plus que le max du critère (poids 1).
    expect(feedScore(c, context) - feedScore(a, context)).toBeLessThanOrEqual(1);
  });

  it('tri stable et sans mutation', () => {
    const input = [item('a', {}), item('b', { createdAt: iso(5) })];
    const snapshot = input.map((i) => i.id);
    const ranked = rankFeed(input, ctx());
    expect(ranked[0].id).toBe('b'); // départage par récence
    expect(input.map((i) => i.id)).toEqual(snapshot);
  });
});
