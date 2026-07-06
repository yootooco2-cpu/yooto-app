import { useEffect, useState } from 'react';

import { getSupabaseClient } from '@/lib/supabase/client';

import { deriveSessionState, SIGNED_OUT, type SessionState } from './session';

/**
 * Hook de session — SEUL point d'accès UI à l'état d'authentification (PR 1).
 * Passe par l'abstraction `getSupabaseClient` (aucun accès direct à supabase-js ailleurs).
 * `loading` = true tant que la session initiale n'est pas résolue. Sans Supabase configuré
 * → `signed-out`, `loading=false` (l'app fonctionne en invité).
 */
export function useSession(): SessionState & { loading: boolean } {
  const [state, setState] = useState<SessionState>(SIGNED_OUT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setState(deriveSessionState(data.session));
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState(deriveSessionState(session));
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { ...state, loading };
}
