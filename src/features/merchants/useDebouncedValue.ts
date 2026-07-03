import { useEffect, useState } from 'react';

/**
 * Valeur « debouncée » : ne se met à jour que `delayMs` après la dernière modification.
 * Utilisé pour lisser l'intention + le re-classement pendant la frappe (recherche instantanée),
 * sans jamais déclencher de requête réseau (le corpus est chargé une seule fois).
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
