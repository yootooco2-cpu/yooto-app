import { activityKindChip } from './activityKind';
import type { CryptoId } from './editorialTypes';
import type { ActivityItem } from './types';

/**
 * NOTIFICATIONS SOCIALES du fil — dérivées des VRAIES publications (activity items). Style
 * Instagram/LinkedIn : commerce + cryptogramme + message spécifique + temps écoulé. Aucune stat
 * générique. Tri intelligent (suivis → imminents → proches → populaires → récents). Pur & testable.
 */
export interface FeedNotification {
  id: string; // id de la publication (pour scroller/surligner dans le fil)
  authorId: string;
  crypto: CryptoId;
  message: string; // phrase courte et spécifique (le titre réel de la publication)
  createdAt: string;
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Temps écoulé façon réseau social : « À l'instant · Il y a 8 min · Il y a 1 h · Il y a 3 j ». */
export function notifTime(iso: string, now: number): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const d = Math.max(0, now - t);
  if (d < MIN) return "À l'instant";
  if (d < HOUR) return `Il y a ${Math.floor(d / MIN)} min`;
  if (d < DAY) return `Il y a ${Math.floor(d / HOUR)} h`;
  return `Il y a ${Math.floor(d / DAY)} j`;
}

/**
 * Score de priorité d'une publication pour le centre de notifications.
 * Hiérarchie demandée : 1) suivis 2) imminents/en direct 3) proximité 4) popularité 5) récence.
 * Les paliers sont volontairement espacés pour que l'ordre 1→5 domine, la récence départageant.
 */
function score(item: ActivityItem, following: Record<string, boolean>, now: number): number {
  let s = 0;
  if (following[item.authorId]) s += 10_000; // 1. commerces suivis
  if (item.startsAt) {
    const st = new Date(item.startsAt).getTime();
    const en = item.endsAt ? new Date(item.endsAt).getTime() : st;
    if (st >= now && st - now <= 3 * HOUR) s += 5_000; // 2. commence bientôt
    else if (st <= now && en >= now) s += 4_500; // en direct
  }
  const km = item.geo?.distanceKm;
  if (km != null) s += Math.max(0, 2_000 - km * 300); // 3. proximité (plus proche = plus haut)
  const reactions = (item.reactions ?? []).reduce((n, r) => n + r.count, 0);
  s += Math.min(1_500, reactions * 60); // 4. popularité
  const age = Math.max(0, now - new Date(item.createdAt).getTime());
  s += Math.max(0, 1_000 - (age / DAY) * 1_000); // 5. récence
  return s;
}

/** Construit les notifications ordonnées (les plus « vivantes » d'abord), limitées à `limit`. */
export function buildFeedNotifications(
  activity: ActivityItem[],
  following: Record<string, boolean>,
  now: number,
  limit = 5,
): FeedNotification[] {
  return [...activity]
    .sort((a, b) => score(b, following, now) - score(a, following, now))
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      authorId: item.authorId,
      crypto: activityKindChip(item.kind).crypto,
      message: item.title,
      createdAt: item.createdAt,
    }));
}
