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
}

const EMPTY: ProfileRow = { exists: false, displayName: null, avatarUrl: null, email: null };

export function useProfileRow(userId: string | null): ProfileRow {
  const [row, setRow] = useState<ProfileRow>(EMPTY);

  useEffect(() => {
    if (!userId) {
      setRow(EMPTY);
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let active = true;

    void supabase
      .from('profiles')
      .select('display_name, avatar_url, primary_email')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !data) {
          setRow(EMPTY);
          return;
        }
        setRow({
          exists: true,
          displayName: data.display_name ?? null,
          avatarUrl: data.avatar_url ?? null,
          email: data.primary_email ?? null,
        });
      });

    return () => {
      active = false;
    };
  }, [userId]);

  return row;
}
