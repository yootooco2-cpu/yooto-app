import { matchIntents } from './intentMatcher';
import type { ResolvedIntent } from './types';

/**
 * Résout une requête en intention(s) — local, déterministe, sans réseau ni LLM.
 * Fusionne les catégories/keywords des intentions reconnues. `undefined` si rien.
 *
 * API stable : pourra plus tard être enrichie (embeddings, recherche vectorielle,
 * personnalisation) sans changer cette signature.
 */
export function resolveIntent(query: string | null | undefined): ResolvedIntent | undefined {
  if (!query) return undefined;
  const defs = matchIntents(query);
  if (defs.length === 0) return undefined;

  const keys: string[] = [];
  const categories: string[] = [];
  const keywords: string[] = [];
  for (const def of defs) {
    keys.push(def.key);
    for (const c of def.categories) if (!categories.includes(c)) categories.push(c);
    for (const k of def.keywords) if (!keywords.includes(k)) keywords.push(k);
  }
  return { query, keys, categories, keywords };
}
