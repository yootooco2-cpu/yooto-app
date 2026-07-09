import type { ChatParticipant, ChatParticipantKind, ChatReputation, GeoScope } from './types';

// ── Avatar : vraie photo si disponible (logo > façade/image > photo perso > initiales) ───────────

/**
 * Meilleure image d'avatar selon la PRIORITÉ : 1) logo officiel, 2) photo de façade / image
 * principale, 3) photo de profil perso. `null` → repli sur les initiales (dernier recours).
 */
export function avatarUri(p: Pick<ChatParticipant, 'logoUrl' | 'coverUrl' | 'avatarUrl'>): string | null {
  return p.logoUrl ?? p.coverUrl ?? p.avatarUrl ?? null;
}

// ── Présence : statut d'activité crédible (jamais un point vert systématique) ─────────────────────

export interface Presence {
  label: string;
  /** Seul « En ligne » affiche la pastille verte. */
  online: boolean;
}

/** Statut d'activité discret d'un acteur, ou `null` si aucune donnée de présence. */
export function presence(p: Pick<ChatParticipant, 'online' | 'lastActiveAt'>, now: number): Presence | null {
  if (p.online) return { label: 'En ligne', online: true };
  if (!p.lastActiveAt) return null;
  const t = Date.parse(p.lastActiveAt);
  if (Number.isNaN(t)) return null;
  const min = Math.floor((now - t) / 60_000);
  if (min < 0) return { label: 'En ligne', online: true };
  if (min < 5) return { label: `Actif il y a ${Math.max(1, min)} min`, online: false };
  if (min < 60) return { label: `Dernière activité il y a ${min} min`, online: false };
  const d = new Date(t);
  const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d.toDateString() === new Date(now).toDateString()) return { label: `Actif aujourd'hui à ${hhmm}`, online: false };
  return { label: `Actif le ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`, online: false };
}

/** Classe une distance en portée géographique (moteur local). « route » est contextuel (trajet). */
export function geoScope(distanceKm: number | undefined): GeoScope {
  if (distanceKm == null) return 'city';
  if (distanceKm <= 0.6) return 'near';
  if (distanceKm <= 2) return 'neighborhood';
  return 'city';
}

/** Libellé lisible du type d'acteur (au-delà du binaire particulier/pro). */
export function actorKindLabel(kind: ChatParticipantKind): string {
  switch (kind) {
    case 'professionnel':
      return 'Professionnel';
    case 'producteur':
      return 'Producteur';
    case 'association':
      return 'Association';
    default:
      return 'Particulier';
  }
}

/** Un pro/producteur/association est-il un compte « acteur du territoire » (vs simple habitant) ? */
export function isTerritoryActor(kind: ChatParticipantKind): boolean {
  return kind === 'professionnel' || kind === 'producteur' || kind === 'association';
}

/** Score de réputation par l'UTILITÉ (jamais la popularité). */
export function reputationScore(reputation: ChatReputation | undefined): number {
  return reputation ? reputation.helpfulScore : 0;
}

/** Confiance affichable : vérifié OU réputation utile significative. */
export function isTrusted(actor: Pick<ChatParticipant, 'verified' | 'reputation'>): boolean {
  return Boolean(actor.verified) || reputationScore(actor.reputation) >= 50;
}

// ── Proximité (indicateurs discrets 🚶 / 🚴) ─────────────────────────────────────────────────────

/** Temps de marche estimé (≈ 5 km/h), minimum 1 min. */
export function walkMinutes(distanceKm: number): number {
  return Math.max(1, Math.round((distanceKm / 5) * 60));
}

/** Temps à vélo estimé (≈ 15 km/h), minimum 1 min. */
export function bikeMinutes(distanceKm: number): number {
  return Math.max(1, Math.round((distanceKm / 15) * 60));
}

/** Indicateur de trajet discret : marche si très proche, vélo si proche, rien au-delà. */
export function proximityHint(distanceKm: number | undefined): { icon: '🚶' | '🚴'; minutes: number } | null {
  if (distanceKm == null) return null;
  if (distanceKm <= 1.2) return { icon: '🚶', minutes: walkMinutes(distanceKm) };
  if (distanceKm <= 5) return { icon: '🚴', minutes: bikeMinutes(distanceKm) };
  return null;
}

// ── Activité en direct (montrer que la ville vit, sans animation agressive) ──────────────────────

/** Un événement daté est-il EN COURS maintenant ? (fin par défaut : 2 h après le début). */
export function isLiveNow(startsAt: string | undefined, endsAt: string | undefined, now: number): boolean {
  if (!startsAt) return false;
  const s = Date.parse(startsAt);
  if (Number.isNaN(s)) return false;
  const e = endsAt ? Date.parse(endsAt) : s + 2 * 60 * 60_000;
  return now >= s && now <= e;
}

/** Publié il y a moins d'une minute → « il y a quelques secondes ». */
export function isFresh(createdAt: string, now: number): boolean {
  const t = Date.parse(createdAt);
  return !Number.isNaN(t) && now - t < 60_000 && now - t >= 0;
}
