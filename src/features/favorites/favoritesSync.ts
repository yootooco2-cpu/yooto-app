/**
 * Fusion PURE des ensembles de favoris (testable, sans dépendance).
 * Union sans doublon, l'ordre local (le plus récent d'abord) prioritaire, puis les
 * favoris serveur non encore connus localement. Idempotent et commutatif sur l'appartenance.
 */
export function mergeFavoriteIds(local: readonly string[], remote: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of local) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  for (const id of remote) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}
