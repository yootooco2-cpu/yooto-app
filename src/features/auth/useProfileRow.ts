import { useEffect, useState } from 'react';

import { ProfileService } from '@/services/ProfileService';

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

export function useProfileRow(userId: string | null, refreshKey = 0): ProfileRow {
  // On garde l'identifiant auquel appartient la ligne : on ne renvoie la donnée que si elle
  // correspond au `userId` courant (évite d'afficher un profil obsolète pendant un changement).
  // `setState` n'est appelé QUE dans le callback asynchrone (jamais dans le corps de l'effet).
  const [state, setState] = useState<{ id: string; row: ProfileRow } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    void ProfileService.get(userId).then((data) => {
      if (!active) return;
      setState({
        id: userId,
        row: data
          ? { exists: true, displayName: data.displayName, avatarUrl: data.avatarUrl, email: data.email, createdAt: data.createdAt }
          : EMPTY,
      });
    });

    return () => {
      active = false;
    };
  }, [userId, refreshKey]);

  return userId && state?.id === userId ? state.row : EMPTY;
}
