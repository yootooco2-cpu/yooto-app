/**
 * Formatage d'affichage partagé (fiche, cartes, listes) — la base stocke des villes
 * en minuscules (« montpellier ») ; on capitalise chaque mot, y compris après
 * tiret/apostrophe (« clermont-l'hérault » → « Clermont-L'Hérault »).
 */
export function formatCityName(city: string | undefined | null): string | undefined {
  if (!city) return undefined;
  return city.replace(/(^|[\s\-'’])([a-zà-ÿ])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}
