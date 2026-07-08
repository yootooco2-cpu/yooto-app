import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Indique si l'utilisateur a activé « Réduire les animations » (accessibilité OS). Toute
 * animation décorative doit se dégrader en transition instantanée quand ce hook renvoie `true`
 * — respect d'une préférence système, jamais contournée. Descriptif et non bloquant : par
 * défaut `false` (animations actives) jusqu'à la première lecture asynchrone.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted) setReduced(value);
      })
      .catch(() => {
        /* API indisponible (web ancien) : on garde les animations. */
      });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
