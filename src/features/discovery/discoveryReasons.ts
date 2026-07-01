import type { SignalContribution } from './types';

/**
 * Génère les explications lisibles à partir des signaux les plus contributifs.
 * L'utilisateur ne voit jamais le score — uniquement ces raisons.
 */
export function reasonsFromContributions(
  contributions: SignalContribution[],
  max = 3,
): string[] {
  const reasons: string[] = [];

  // Raison composite : forte qualité ET forte proximité.
  const rating = contributions.find((c) => c.key === 'rating');
  const distance = contributions.find((c) => c.key === 'distance');
  if (rating && distance && rating.value >= 0.8 && distance.value >= 0.6) {
    reasons.push('Excellent rapport qualité / proximité');
  }

  const ranked = [...contributions]
    .filter((c) => c.reason && c.value > 0.5)
    .sort((a, b) => b.weight * b.value - a.weight * a.value);

  for (const c of ranked) {
    if (c.reason && !reasons.includes(c.reason)) reasons.push(c.reason);
  }

  return reasons.slice(0, max);
}
