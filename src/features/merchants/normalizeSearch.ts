// normalizeSearch — normalisation PURE des chaînes de recherche.
// Insensible aux accents et à la casse → « cafe » retrouve « Café ».

/** Minuscule, sans accents/diacritiques, sans espaces superflus. */
export function normalizeSearch(input: string | undefined | null): string {
  return (input ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}
