import { useEffect, useState } from 'react';

import { getSupabaseClient } from '@/lib/supabase/client';

/**
 * Lecture (défensive) de la LIGNE profil en base pour l'utilisateur courant — preuve que le
 * profil a bien été créé automatiquement (trigger 004/006). Passe par `getSupabaseClient`
 * (aucun accès direct). Tolérant : si la table n'existe pas encore ou en cas d'erreur RLS,
 * renvoie `exists=false` sans casser l'écran.
 */
export interface ProfileRow {
  exists: boolean;
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  /** Date de création du profil (ISO) — pour « Membre depuis … ». */
  createdAt: string | null;
}

const EMPTY: ProfileRow = { exists: false, displayName: null, avatarUrl: null, email: null, createdAt: null };

export function useProfileRow(userId: string | null): ProfileRow {
  // On garde l'identifiant auquel appartient la ligne : on ne renvoie la donnée que si elle
  // correspond au `userId` courant (évite d'afficher un profil obsolète pendant un changement).
  // `setState` n'est appelé QUE dans le callback asynchrone (jamais dans le corps de l'effet).
  const [state, setState] = useState<{ id: string; row: ProfileRow } | null>(null);

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let active = true;

    void supabase
      .from('profiles')
      .select('display_name, avatar_url, primary_email, created_at')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        setState({
          id: userId,
          row:
            error || !data
              ? EMPTY
              : {
                  exists: true,
                  displayName: data.display_name ?? null,
                  avatarUrl: data.avatar_url ?? null,
                  email: data.primary_email ?? null,
                  createdAt: data.created_at ?? null,
                },
        });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  return userId && state?.id === userId ? state.row : EMPTY;
}
