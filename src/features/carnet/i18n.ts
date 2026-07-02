// i18n — traduction MINIMALE et scoped au Carnet « De saison » (fr / en / es).
// Le projet n'a pas de système i18n global ; on n'introduit donc qu'un t() local, sans
// dépendance. Seuls les LABELS UI sont traduits — noms de produits et mois restent en
// français (cf. saison.ts). Locale par défaut : fr (pas de expo-localization installé).

export type Locale = 'fr' | 'en' | 'es';

export type CarnetKey =
  | 'title'
  | 'subtitle'
  | 'pickMonth'
  | 'legumes'
  | 'fruits'
  | 'inSeason'
  | 'kcal'
  | 'nutri'
  | 'bienfait'
  | 'prix'
  | 'recipes'
  | 'recipesLead'
  | 'onMarmiton'
  | 'note'
  | 'close'
  | 'empty';

const DICT: Record<Locale, Record<CarnetKey, string>> = {
  fr: {
    title: 'De saison',
    subtitle: 'Le meilleur de chaque mois, près de chez vous.',
    pickMonth: 'Choisissez un mois',
    legumes: 'Légumes',
    fruits: 'Fruits',
    inSeason: 'De saison',
    kcal: 'kcal / 100 g',
    nutri: 'Apports nutritifs',
    bienfait: 'Bienfait santé',
    prix: 'Prix indicatif',
    recipes: 'Idées recettes — sur Marmiton',
    recipesLead: 'Des idées gourmandes, sur Marmiton.',
    onMarmiton: 'sur Marmiton',
    note: "Manger de saison, c'est bon pour la santé, la planète et les producteurs locaux.",
    close: 'Fermer',
    empty: 'Aucun produit référencé ce mois-ci.',
  },
  en: {
    title: 'In season',
    subtitle: 'The best of every month, near you.',
    pickMonth: 'Pick a month',
    legumes: 'Vegetables',
    fruits: 'Fruits',
    inSeason: 'In season',
    kcal: 'kcal / 100 g',
    nutri: 'Nutrition',
    bienfait: 'Health benefit',
    prix: 'Indicative price',
    recipes: 'Recipe ideas — on Marmiton',
    recipesLead: 'Tasty ideas, on Marmiton.',
    onMarmiton: 'on Marmiton',
    note: 'Eating in season is good for you, the planet and local producers.',
    close: 'Close',
    empty: 'No product listed this month.',
  },
  es: {
    title: 'De temporada',
    subtitle: 'Lo mejor de cada mes, cerca de ti.',
    pickMonth: 'Elige un mes',
    legumes: 'Verduras',
    fruits: 'Frutas',
    inSeason: 'De temporada',
    kcal: 'kcal / 100 g',
    nutri: 'Aportes nutritivos',
    bienfait: 'Beneficio para la salud',
    prix: 'Precio indicativo',
    recipes: 'Ideas de recetas — en Marmiton',
    recipesLead: 'Ideas ricas, en Marmiton.',
    onMarmiton: 'en Marmiton',
    note: 'Comer de temporada es bueno para ti, el planeta y los productores locales.',
    close: 'Cerrar',
    empty: 'Ningún producto listado este mes.',
  },
};

export const DEFAULT_LOCALE: Locale = 'fr';

export function t(key: CarnetKey, locale: Locale = DEFAULT_LOCALE): string {
  return DICT[locale][key];
}
