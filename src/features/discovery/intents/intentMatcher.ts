import { INTENTS } from './intentDictionary';
import type { IntentDefinition } from './types';

// Marques diacritiques combinantes (U+0300–U+036F), construites sans caractères littéraux.
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');

/** Normalise pour une comparaison robuste : minuscules + suppression des accents. */
export function normalizeText(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(DIACRITICS, '');
}

/**
 * Matcher déterministe, local, ultra-rapide : retourne toutes les intentions
 * dont un alias apparaît dans la requête (raisonnement par dictionnaire, pas
 * simple égalité de texte).
 */
export function matchIntents(query: string): IntentDefinition[] {
  const q = normalizeText(query.trim());
  if (!q) return [];
  return INTENTS.filter((def) => def.aliases.some((alias) => q.includes(normalizeText(alias))));
}
