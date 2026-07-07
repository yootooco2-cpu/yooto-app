import { useEffect, useState } from 'react';

import { getSupabaseClient } from '@/lib/supabase/client';

/**
 * Ensemble des fournisseurs d'identité LIÉS au compte courant (ex. `google`, `apple`, `email`).
 * Lu depuis `app_metadata.providers` de la session Supabase (aucune écriture). Vide en invité ou
 * sans Supabase. Sert à afficher l'état ✓ Connecté / ○ Non connecté dans les Paramètres.
 */
export function useLinkedProviders(userId: string | null): Set<string> {
  const [providers, setProviders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const meta = data.session?.user?.app_metadata as { providers?: unknown } | undefined;
      const list = Array.isArray(meta?.providers) ? (meta?.providers as unknown[]) : [];
      setProviders(new Set(list.filter((p): p is string => typeof p === 'string')));
    });

    return () => {
      active = false;
    };
  }, [userId]);

  return providers;
}
