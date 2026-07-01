import type { Signal } from './types';

/** Adéquation au moment de la journée (déjeuner / dîner pour la restauration). */
const mealTimeSignal: Signal = (merchant, ctx) => {
  if (merchant.category !== 'restaurant') return null;
  if (ctx.hour >= 11 && ctx.hour <= 14) {
    return { key: 'mealTime', weight: 1, value: 1, reason: 'Idéal pour ce midi' };
  }
  if (ctx.hour >= 18 && ctx.hour <= 21) {
    return { key: 'mealTime', weight: 1, value: 1, reason: 'Parfait pour ce soir' };
  }
  return null;
};

/** Saisonnalité (légère mise en avant des producteurs au printemps/été). */
const seasonSignal: Signal = (merchant, ctx) => {
  if (merchant.category !== 'producer') return null;
  if (ctx.season === 'spring' || ctx.season === 'summer') {
    return { key: 'season', weight: 0.4, value: 0.8, reason: 'Produits de saison' };
  }
  return null;
};

export const timeSignals: Signal[] = [mealTimeSignal, seasonSignal];
