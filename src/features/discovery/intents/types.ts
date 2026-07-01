/**
 * Intent Engine — types. Domaine-agnostiques (catégories en `string` →
 * pas de couplage au type Merchant, pas de cycle).
 */
export interface IntentDefinition {
  key: string;
  /** Termes déclencheurs (l'utilisateur peut taper l'un d'eux). */
  aliases: string[];
  /** Catégories canoniques pertinentes, par ordre de priorité. */
  categories: string[];
  /** Mots-clés recherchés dans le nom/description (élargissement sémantique). */
  keywords: string[];
}

/** Résultat de la résolution d'une recherche en intention(s). */
export interface ResolvedIntent {
  query: string;
  keys: string[];
  categories: string[];
  keywords: string[];
}
