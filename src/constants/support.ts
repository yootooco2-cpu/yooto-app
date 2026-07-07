/**
 * Coordonnées de support YOOTOO — source unique (aucune duplication en dur ailleurs).
 * Sans rapport avec l'email du profil utilisateur (auth Google / `profiles`) : c'est
 * l'adresse de contact publique de l'application.
 */
export const SUPPORT_EMAIL = 'contact@you2.cloud';

/** Lien `mailto:` prêt à ouvrir le client mail. */
export function supportMailtoUrl(): string {
  return `mailto:${SUPPORT_EMAIL}`;
}
