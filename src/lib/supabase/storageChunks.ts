/**
 * Découpage PUR d'une chaîne en fragments — utilisé par le stockage de session natif
 * (`expo-secure-store` plafonne ~2 Ko/clé). Isolé et sans dépendance → testable.
 */
export function chunkString(value: string, size: number): string[] {
  if (size <= 0) return [value];
  const out: string[] = [];
  for (let i = 0; i < value.length; i += size) out.push(value.slice(i, i + size));
  return out.length ? out : [''];
}
