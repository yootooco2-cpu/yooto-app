import type { Signal } from './types';

/**
 * Signaux utilisateur. Architecture prête : aujourd'hui les ensembles du contexte
 * sont vides (pas d'auth/historique), donc ces signaux renvoient `null` (neutres).
 * Demain, alimentés par Supabase/stockage, ils s'activeront SANS modifier le moteur.
 */

/** Favori explicite. */
const favoriteSignal: Signal = (merchant, ctx) =>
  ctx.favorites.has(merchant.id)
    ? { key: 'favorite', weight: 2, value: 1, reason: 'Dans vos favoris' }
    : null;

/** Habitude : catégorie souvent consultée/appréciée. */
const habitSignal: Signal = (merchant, ctx) =>
  ctx.preferredCategories.has(merchant.category)
    ? { key: 'habit', weight: 1.2, value: 1, reason: 'Vous aimez souvent ce type de commerce' }
    : null;

/** Historique : commerce déjà vu → légère décote (favoriser la découverte). */
const historySignal: Signal = (merchant, ctx) =>
  ctx.history.has(merchant.id) ? { key: 'history', weight: 0.5, value: 0.3 } : null;

export const userSignals: Signal[] = [favoriteSignal, habitSignal, historySignal];
