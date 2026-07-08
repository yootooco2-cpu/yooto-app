import { useSession } from '@/features/auth';

/**
 * E-mails ADMIN autorisés à voir le Centre de pilotage HORS développement (démo/prod).
 * Vide par défaut → en prod, le cockpit n'est visible que pour ces comptes. Ajouter un e-mail ici
 * suffit ; quand un vrai système de rôles existera, brancher `identity.role === 'admin'` à la place.
 */
export const ADMIN_EMAILS: string[] = [];

/**
 * Accès au Centre de pilotage : réservé à l'équipe YOOTOO.
 * `true` en développement (`__DEV__`) OU pour un compte administrateur (allowlist). Jamais pour un
 * utilisateur classique.
 */
export function useControlCenterAccess(): boolean {
  const { identity } = useSession();
  const email = identity?.email?.trim().toLowerCase() ?? '';
  const isAdmin = email.length > 0 && ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email);
  return __DEV__ || isAdmin;
}
