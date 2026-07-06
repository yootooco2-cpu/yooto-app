import { useEffect } from 'react';

import { useSession } from '@/features/auth';

import { useFavoritesStore } from './favoritesStore';

/**
 * Branche la synchro des favoris sur le cycle de vie (à appeler UNE fois, écran carte) :
 *  - au montage : hydrate (disque + serveur si dispo) ;
 *  - à l'apparition/changement d'utilisateur (ex. après upgrade Google/Apple) : re-hydrate
 *    → on retrouve immédiatement ses favoris. Idempotent (union), non bloquant.
 */
export function useFavoritesSync(): void {
  const hydrate = useFavoritesStore((s) => s.hydrate);
  const syncServer = useFavoritesStore((s) => s.syncServer);
  const { userId } = useSession();

  // Disque au montage (sans réseau).
  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Serveur uniquement quand une session apparaît (anonyme ou après upgrade).
  useEffect(() => {
    if (userId) void syncServer();
  }, [userId, syncServer]);
}
