/**
 * État de session — logique PURE (testable, sans dépendance Supabase/React).
 *
 * Trois états dérivés d'une session Supabase :
 *  - `signed-out`    : aucune session (invité local).
 *  - `anonymous`     : session anonyme Supabase (`is_anonymous = true`).
 *  - `authenticated` : session liée à une identité (Google/Apple/email).
 *
 * Pour un utilisateur authentifié, on extrait aussi l'IDENTITÉ affichable (nom, email, photo)
 * depuis les métadonnées du fournisseur (Google/Apple) — aucun formulaire requis.
 */
export type SessionStatus = 'signed-out' | 'anonymous' | 'authenticated';

export interface SessionIdentity {
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
}

export interface SessionState {
  status: SessionStatus;
  userId: string | null;
  isAnonymous: boolean;
  /** Identité affichable (uniquement si authentifié via un fournisseur). */
  identity: SessionIdentity | null;
}

export const SIGNED_OUT: SessionState = { status: 'signed-out', userId: null, isAnonymous: false, identity: null };

/** Session minimale nécessaire à la dérivation (compatible `@supabase/supabase-js`). */
interface MinimalUser {
  id: string;
  is_anonymous?: boolean;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}
interface MinimalSession {
  user?: MinimalUser | null;
}

/** Première chaîne non vide parmi les candidats. */
function firstText(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === 'string') {
      const t = c.trim();
      if (t) return t;
    }
  }
  return null;
}

/** Extrait l'identité affichable depuis les métadonnées du fournisseur. */
export function deriveIdentity(user: MinimalUser): SessionIdentity {
  const meta = user.user_metadata ?? {};
  const first = typeof meta.given_name === 'string' ? meta.given_name : typeof meta.first_name === 'string' ? meta.first_name : '';
  const last = typeof meta.family_name === 'string' ? meta.family_name : typeof meta.last_name === 'string' ? meta.last_name : '';
  const joined = `${first} ${last}`.trim();
  const email = firstText(user.email, meta.email as string);
  return {
    displayName: firstText(meta.full_name, meta.name, joined, email ? email.split('@')[0] : null),
    email,
    avatarUrl: firstText(meta.avatar_url, meta.picture),
  };
}

/** PUR : dérive l'état de session depuis une session Supabase (ou `null`). */
export function deriveSessionState(session: MinimalSession | null | undefined): SessionState {
  const user = session?.user;
  if (!user) return SIGNED_OUT;
  const isAnonymous = user.is_anonymous === true;
  return {
    status: isAnonymous ? 'anonymous' : 'authenticated',
    userId: user.id,
    isAnonymous,
    identity: isAnonymous ? null : deriveIdentity(user),
  };
}
