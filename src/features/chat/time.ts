/**
 * Formatage RELATIF d'un horodatage de chat (pur & testable — `now` injecté).
 * « À l'instant » · « 12 min » · « 14:35 » (aujourd'hui) · « Hier » · « 3 j » · « 12/06 ».
 */
export function formatChatTime(iso: string, now: number): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Math.max(0, now - t);
  const MIN = 60_000;
  const HOUR = 60 * MIN;
  const DAY = 24 * HOUR;

  if (diff < MIN) return "À l'instant";
  if (diff < HOUR) return `${Math.floor(diff / MIN)} min`;

  const d = new Date(t);
  const ref = new Date(now);
  const sameDay = d.toDateString() === ref.toDateString();
  if (sameDay) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  const yesterday = new Date(ref.getTime() - DAY);
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';

  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} j`;

  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
