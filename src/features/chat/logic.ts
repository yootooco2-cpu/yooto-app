import type { ChatParticipant, ChatParticipantKind, ChatReputation, GeoScope } from './types';

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
