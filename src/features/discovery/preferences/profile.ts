import { eventWeight } from './weights';
import type { PreferenceEvent, PreferenceProfile, PreferenceSnapshot } from './types';

/** Version du schéma de préférences (v2 : ajout de `updatedAt` + décroissance). */
export const PREFERENCES_VERSION = 2;

const MS_PER_DAY = 86_400_000;
/**
 * Taux de décroissance journalier. Calibré pour approcher la courbe cible :
 * 7 j ≈ 0.94 · 30 j ≈ 0.77 · 90 j ≈ 0.45 · 180 j ≈ 0.20.
 */
const DECAY_PER_DAY = 0.00894;
/** Seuil d'élagage : on oublie une catégorie dont le poids décroît sous ce niveau. */
const PRUNE_THRESHOLD = 0.02;

function decayFactor(elapsedMs: number): number {
  const days = Math.max(0, elapsedMs) / MS_PER_DAY;
  return Math.exp(-DECAY_PER_DAY * days);
}

export function createEmptyProfile(): PreferenceProfile {
  return {
    categoryCounts: {},
    producerCount: 0,
    totalInteractions: 0,
    updatedAt: Date.now(),
    version: PREFERENCES_VERSION,
  };
}

/**
 * Applique un événement de façon INCRÉMENTALE avec décroissance temporelle :
 * les compteurs existants sont d'abord atténués selon le temps écoulé depuis
 * la dernière mise à jour, puis le nouvel événement est ajouté à plein poids.
 * → les préférences récentes comptent davantage. Complexité O(catégories).
 */
export function applyEvent(
  profile: PreferenceProfile,
  event: PreferenceEvent,
  now: number = Date.now(),
): PreferenceProfile {
  const w = eventWeight(event.type);
  if (w <= 0) return profile;

  const factor = decayFactor(now - profile.updatedAt);
  const categoryCounts: Record<string, number> = {};
  for (const [category, count] of Object.entries(profile.categoryCounts)) {
    const decayed = count * factor;
    if (decayed >= PRUNE_THRESHOLD) categoryCounts[category] = decayed;
  }
  if (event.category) {
    categoryCounts[event.category] = (categoryCounts[event.category] ?? 0) + w;
  }

  return {
    categoryCounts,
    producerCount: profile.producerCount * factor + (event.isProducer ? w : 0),
    totalInteractions: profile.totalInteractions * factor + w,
    updatedAt: now,
    version: PREFERENCES_VERSION,
  };
}

/**
 * Vue normalisée pour le scoring. Les affinités étant des RATIOS
 * (count / total), une décroissance uniforme se simplifie : seule la fraîcheur
 * relative des événements influe. O(catégories), aucun recalcul global.
 */
export function deriveSnapshot(profile: PreferenceProfile): PreferenceSnapshot {
  const entries = Object.entries(profile.categoryCounts);
  const catTotal = entries.reduce((acc, [, n]) => acc + n, 0) || 1;

  const categoryAffinity: Record<string, number> = {};
  for (const [cat, n] of entries) categoryAffinity[cat] = n / catTotal;

  const topCategories = [...entries]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat]) => cat);

  const producerAffinity =
    profile.totalInteractions > 0
      ? Math.min(1, profile.producerCount / profile.totalInteractions)
      : 0;

  return { topCategories, categoryAffinity, producerAffinity, hasData: profile.totalInteractions > 0 };
}

function hasValidCounts(data: Partial<PreferenceProfile>): boolean {
  return (
    typeof data.totalInteractions === 'number' &&
    typeof data.producerCount === 'number' &&
    typeof data.categoryCounts === 'object' &&
    data.categoryCounts !== null
  );
}

/**
 * Parse un profil stocké de façon TOLÉRANTE + MIGRATION v1 → v2.
 * - v1 (sans `updatedAt`) → migré en conservant les compteurs (compatibilité).
 * - version inconnue / forme corrompue / JSON invalide → profil vide.
 */
export function parseStoredProfile(raw: string): PreferenceProfile {
  try {
    const data = JSON.parse(raw) as Partial<PreferenceProfile> | null;
    if (!data || typeof data !== 'object' || !hasValidCounts(data)) return createEmptyProfile();

    const categoryCounts = data.categoryCounts as Record<string, number>;
    const producerCount = data.producerCount as number;
    const totalInteractions = data.totalInteractions as number;

    if (data.version === 1) {
      // Migration v1 → v2 : conserver l'appris, initialiser la fraîcheur.
      return { categoryCounts, producerCount, totalInteractions, updatedAt: Date.now(), version: PREFERENCES_VERSION };
    }
    if (data.version !== PREFERENCES_VERSION) return createEmptyProfile();

    return {
      categoryCounts,
      producerCount,
      totalInteractions,
      updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
      version: PREFERENCES_VERSION,
    };
  } catch {
    return createEmptyProfile();
  }
}
