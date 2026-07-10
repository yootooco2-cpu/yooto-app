import type { ActivityItem, ChatParticipant } from './types';

/**
 * CLASSEMENT DU FIL SOCIAL — priorités produit (validées) traduites en score pondéré :
 *
 *  1. proximité (poids 3)      — le local d'abord, c'est la promesse YOOTOO ;
 *  2. commerces suivis (2.5)   — ta communauté avant le reste ;
 *  3. récence (2)              — un fil VIVANT, jamais un mur d'archives ;
 *  4. partenaires/vérifiés (1.5) — la confiance mise en avant, sans écraser le local ;
 *  5. engagement (1)           — réactions + réponses, plafonné (jamais de course au buzz —
 *                                 constitution Chat : utilité > popularité).
 *
 * Score continu (pas de cascade stricte) : une publication très proche et récente d'un
 * commerce non suivi peut dépasser une publication lointaine d'un suivi — c'est voulu,
 * le fil raconte le territoire immédiat. Tri stable, départage par récence.
 */

export interface FeedRankContext {
  /** Acteurs suivis (id → true) — forme exacte du store. */
  following: Record<string, boolean>;
  now: number;
  /** Auteurs (badge partenaire/vérifié). */
  participants: Record<string, ChatParticipant>;
  /** Nombre de réponses par publication (depuis le store) — optionnel. */
  commentCounts?: Record<string, number>;
}

const proximityScore = (distanceKm: number | undefined): number => {
  if (distanceKm === undefined) return 0;
  if (distanceKm <= 0.5) return 1;
  if (distanceKm <= 1) return 0.8;
  if (distanceKm <= 3) return 0.5;
  if (distanceKm <= 10) return 0.2;
  return 0;
};

const recencyScore = (createdAt: string, now: number): number => {
  const t = Date.parse(createdAt);
  if (Number.isNaN(t)) return 0;
  const hours = (now - t) / 3_600_000;
  if (hours <= 1) return 1;
  if (hours <= 6) return 0.7;
  if (hours <= 24) return 0.4;
  if (hours <= 72) return 0.15;
  return 0;
};

/** Partenaire = acteur vérifié ou porteur d'un badge pro/producteur. */
export const isPartnerAuthor = (p: ChatParticipant | undefined): boolean =>
  Boolean(
    p &&
      (p.verified ||
        p.badges?.some((b) => b.kind === 'verified_pro' || b.kind === 'producteur_local')),
  );

const engagementScore = (item: ActivityItem, comments: number): number => {
  const reactions = (item.reactions ?? []).reduce((n, r) => n + r.count, 0);
  return Math.min(1, (reactions + 2 * comments) / 30);
};

/** Score total d'une publication (exporté pour les tests). */
export function feedScore(item: ActivityItem, ctx: FeedRankContext): number {
  return (
    3 * proximityScore(item.geo?.distanceKm) +
    2.5 * (ctx.following[item.authorId] ? 1 : 0) +
    2 * recencyScore(item.createdAt, ctx.now) +
    1.5 * (isPartnerAuthor(ctx.participants[item.authorId]) ? 1 : 0) +
    1 * engagementScore(item, ctx.commentCounts?.[item.id] ?? 0)
  );
}

/** Fil classé — jamais de mutation de l'entrée, départage stable par récence. */
export function rankFeed(items: readonly ActivityItem[], ctx: FeedRankContext): ActivityItem[] {
  return [...items]
    .map((item) => ({ item, score: feedScore(item, ctx) }))
    .sort(
      (a, b) =>
        b.score - a.score || Date.parse(b.item.createdAt) - Date.parse(a.item.createdAt),
    )
    .map((x) => x.item);
}
