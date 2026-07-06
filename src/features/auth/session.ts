/**
 * État de session — logique PURE (testable, sans dépendance Supabase/React).
 *
 * Trois états dérivés d'une session Supabase :
 *  - `signed-out`    : aucune session (invité local).
 *  - `anonymous`     : session anonyme Supabase (`is_anonymous = true`).
 *  - `authenticated` : session liée à une identité (Google/Apple/email).
 */
export type SessionStatus = 'signed-out' | 'anonymous' | 'authenticated';

export interface SessionState {
  status: SessionStatus;
  userId: string | null;
  isAnonymous: boolean;
}

export const SIGNED_OUT: SessionState = { status: 'signed-out', userId: null, isAnonymous: false };

/** Session minimale nécessaire à la dérivation (compatible `@supabase/supabase-js`). */
interface MinimalSession {
  user?: { id: string; is_anonymous?: boolean } | null;
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
  };
}
