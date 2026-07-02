// saison — données de la Carte de saison (Carnet YOOTOO).
// SOURCE UNIQUE : SAISON_CAL (calendrier 12 mois) + SAISON_IMG (emoji) + SAISON_PRODUITS
// (fiches détaillées). Noms de produits et mois en FRANÇAIS (seuls les labels UI sont
// traduits, cf. i18n.ts). Règle stricte : un mois n'affiche QUE les produits listés dans
// SAISON_CAL pour ce mois → jamais de produit hors saison.

export type ProduitType = 'legume' | 'fruit';

export interface FicheProduit {
  /** Toujours pour 100 g. */
  kcal?: number;
  /** Apports nutritifs (résumé). */
  nutri: string;
  /** Bienfait santé. */
  bienfait: string;
  /** Prix indicatif AVEC unité (€/kg, €/pièce, €/botte). */
  prix: string;
  /** Idées de recettes (texte libre) → recherche Marmiton dynamique. */
  recettes: string[];
}

export interface ProduitResolu {
  nom: string;
  emoji: string;
  type: ProduitType;
  fiche: FicheProduit;
}

/** Mois en français (index 0 = Janvier, aligné sur Date.getMonth()). */
export const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
] as const;

/** Calendrier 12 mois — produits de saison par mois (autorité « jamais hors saison »). */
export const SAISON_CAL: Record<number, { legumes: string[]; fruits: string[] }> = {
  0: { legumes: ['Betterave', 'Carotte', 'Chou', 'Endive', 'Épinard', 'Mâche', 'Navet', 'Poireau', 'Pomme de terre', 'Potiron'], fruits: ['Clémentine', 'Kiwi', 'Orange', 'Poire', 'Pomme'] },
  1: { legumes: ['Betterave', 'Carotte', 'Chou', 'Endive', 'Mâche', 'Navet', 'Panais', 'Poireau', 'Topinambour'], fruits: ['Kiwi', 'Orange', 'Pamplemousse', 'Poire', 'Pomme'] },
  2: { legumes: ['Betterave', 'Carotte', 'Chou', 'Endive', 'Épinard', 'Poireau', 'Radis', 'Topinambour'], fruits: ['Kiwi', 'Orange', 'Pomme'] },
  3: { legumes: ['Asperge', 'Betterave', 'Carotte', 'Épinard', 'Navet', 'Petit pois', 'Radis'], fruits: ['Pomme', 'Rhubarbe'] },
  4: { legumes: ['Asperge', 'Blette', 'Carotte', 'Concombre', 'Épinard', 'Petit pois', 'Radis'], fruits: ['Cerise', 'Fraise', 'Rhubarbe'] },
  5: { legumes: ['Artichaut', 'Aubergine', 'Concombre', 'Courgette', 'Haricot vert', 'Petit pois', 'Poivron', 'Radis', 'Tomate'], fruits: ['Abricot', 'Cerise', 'Fraise', 'Framboise', 'Melon', 'Pêche'] },
  6: { legumes: ['Aubergine', 'Concombre', 'Courgette', 'Haricot vert', 'Poivron', 'Tomate'], fruits: ['Abricot', 'Cassis', 'Cerise', 'Figue', 'Framboise', 'Melon', 'Pêche', 'Prune'] },
  7: { legumes: ['Aubergine', 'Concombre', 'Courgette', 'Haricot vert', 'Maïs', 'Poivron', 'Tomate'], fruits: ['Abricot', 'Figue', 'Melon', 'Mirabelle', 'Mûre', 'Pêche', 'Prune', 'Raisin'] },
  8: { legumes: ['Aubergine', 'Betterave', 'Brocoli', 'Courgette', 'Épinard', 'Poireau', 'Poivron', 'Tomate'], fruits: ['Figue', 'Noisette', 'Poire', 'Pomme', 'Prune', 'Raisin'] },
  9: { legumes: ['Betterave', 'Brocoli', 'Carotte', 'Chou', 'Courge', 'Épinard', 'Poireau', 'Potiron'], fruits: ['Châtaigne', 'Coing', 'Noix', 'Poire', 'Pomme', 'Raisin'] },
  10: { legumes: ['Betterave', 'Carotte', 'Chou', 'Courge', 'Endive', 'Mâche', 'Navet', 'Poireau', 'Potiron'], fruits: ['Châtaigne', 'Clémentine', 'Kiwi', 'Poire', 'Pomme'] },
  11: { legumes: ['Betterave', 'Carotte', 'Chou', 'Endive', 'Mâche', 'Navet', 'Poireau', 'Potiron', 'Topinambour'], fruits: ['Clémentine', 'Kiwi', 'Mandarine', 'Orange', 'Poire', 'Pomme'] },
};

/** Emoji par produit (repli 🧺 si absent). */
export const SAISON_IMG: Record<string, string> = {
  // Légumes
  Artichaut: '🥬', Asperge: '🥬', Aubergine: '🍆', Betterave: '🥬', Blette: '🥬', Brocoli: '🥦',
  Carotte: '🥕', Chou: '🥬', Concombre: '🥒', Courge: '🎃', Courgette: '🥒', Endive: '🥬',
  Épinard: '🥬', 'Haricot vert': '🫛', Maïs: '🌽', Mâche: '🥬', Navet: '🥬', Panais: '🥬',
  'Petit pois': '🫛', Poireau: '🥬', Poivron: '🫑', 'Pomme de terre': '🥔', Potiron: '🎃',
  Radis: '🥬', Tomate: '🍅', Topinambour: '🥬',
  // Fruits
  Abricot: '🍑', Cassis: '🫐', Cerise: '🍒', Châtaigne: '🌰', Clémentine: '🍊', Coing: '🍐',
  Figue: '🍇', Fraise: '🍓', Framboise: '🫐', Kiwi: '🥝', Mandarine: '🍊', Melon: '🍈',
  Mirabelle: '🍑', Mûre: '🫐', Noisette: '🌰', Noix: '🌰', Orange: '🍊', Pamplemousse: '🍊',
  Pêche: '🍑', Poire: '🍐', Pomme: '🍏', Prune: '🍑', Raisin: '🍇', Rhubarbe: '🥬',
};

/** Repli obligatoire si fiche manquante. */
export const SAISON_FALLBACK: FicheProduit = {
  nutri: 'Produit de saison',
  bienfait: 'Cueilli à maturité, plein de saveur',
  recettes: ['À déguster nature'],
  prix: "Selon l'arrivage",
};

/** Fiches détaillées (couverture partielle — le reste retombe sur SAISON_FALLBACK). */
export const SAISON_PRODUITS: Record<string, FicheProduit> = {
  Tomate: { kcal: 18, nutri: 'Riche en vitamine C, potassium et lycopène', bienfait: 'Antioxydant, hydratant', prix: '2,50 €/kg', recettes: ['Salade', 'Tarte', 'Farcies'] },
  Carotte: { kcal: 41, nutri: 'Bêta-carotène, fibres, vitamine A', bienfait: 'Bon pour la vue et la peau', prix: '1,80 €/kg', recettes: ['Râpée', 'Soupe', 'Rôties au four'] },
  Courgette: { kcal: 17, nutri: 'Eau, potassium, vitamine C', bienfait: 'Légère et digeste', prix: '2,20 €/kg', recettes: ['Gratin', 'Poêlée', 'Velouté'] },
  Aubergine: { kcal: 25, nutri: 'Fibres, antioxydants', bienfait: 'Rassasiante, peu calorique', prix: '2,90 €/kg', recettes: ['Ratatouille', 'Caviar', 'Gratin'] },
  Poireau: { kcal: 27, nutri: 'Fibres, vitamine K, folates', bienfait: 'Draineur doux', prix: '2,40 €/botte', recettes: ['Fondue', 'Quiche', 'Vinaigrette'] },
  Épinard: { kcal: 23, nutri: 'Fer, folates, vitamine K', bienfait: 'Reminéralisant', prix: '3,50 €/kg', recettes: ['À la crème', 'Quiche', 'Sauté'] },
  Potiron: { kcal: 26, nutri: 'Bêta-carotène, fibres', bienfait: 'Réconfortant et antioxydant', prix: '1,90 €/kg', recettes: ['Velouté', 'Gratin', 'Tarte'] },
  'Pomme de terre': { kcal: 77, nutri: 'Glucides complexes, potassium', bienfait: 'Énergie durable', prix: '1,50 €/kg', recettes: ['Purée', 'Au four', 'Gratin'] },
  Radis: { kcal: 16, nutri: 'Vitamine C, soufre', bienfait: 'Croquant et détox', prix: '1,20 €/botte', recettes: ['Croque-au-sel', 'Beurre', 'Pickles'] },
  Concombre: { kcal: 15, nutri: 'Eau, potassium', bienfait: 'Rafraîchissant', prix: '1,10 €/pièce', recettes: ['Salade', 'Tzatziki', 'Gaspacho'] },
  Poivron: { kcal: 26, nutri: 'Vitamine C, antioxydants', bienfait: 'Boost immunité', prix: '3,20 €/kg', recettes: ['Farcis', 'Poêlée', 'Grillés'] },
  Chou: { kcal: 25, nutri: 'Vitamine C, fibres', bienfait: 'Protecteur, rassasiant', prix: '1,90 €/pièce', recettes: ['Braisé', 'Soupe', 'Salade'] },
  Pomme: { kcal: 52, nutri: 'Fibres (pectine), vitamine C', bienfait: 'Transit et satiété', prix: '2,30 €/kg', recettes: ['Compote', 'Tarte', 'Au four'] },
  Poire: { kcal: 57, nutri: 'Fibres, vitamine C', bienfait: 'Douce et digeste', prix: '2,80 €/kg', recettes: ['Pochée', 'Tarte', 'Crumble'] },
  Fraise: { kcal: 33, nutri: 'Vitamine C, antioxydants', bienfait: 'Peu sucrée, antioxydante', prix: '4,50 €/kg', recettes: ['Nature', 'Coulis', 'Tarte'] },
  Cerise: { kcal: 63, nutri: 'Antioxydants, potassium', bienfait: 'Anti-inflammatoire', prix: '5,90 €/kg', recettes: ['Clafoutis', 'Confiture', 'Nature'] },
  Pêche: { kcal: 39, nutri: 'Vitamine C, eau', bienfait: 'Hydratante', prix: '3,50 €/kg', recettes: ['Nature', 'Rôtie', 'Salade'] },
  Abricot: { kcal: 48, nutri: 'Bêta-carotène, potassium', bienfait: 'Bon pour la peau', prix: '3,90 €/kg', recettes: ['Tarte', 'Confiture', 'Rôti'] },
  Raisin: { kcal: 69, nutri: 'Sucres, polyphénols', bienfait: 'Énergisant, antioxydant', prix: '3,60 €/kg', recettes: ['Nature', 'Tarte', 'Chutney'] },
  Melon: { kcal: 34, nutri: 'Eau, bêta-carotène', bienfait: 'Rafraîchissant', prix: '2,50 €/pièce', recettes: ['Nature', 'Jambon cru', 'Sorbet'] },
  Orange: { kcal: 47, nutri: 'Vitamine C, folates', bienfait: 'Immunité', prix: '2,20 €/kg', recettes: ['Pressée', 'Salade', 'Confite'] },
  Clémentine: { kcal: 47, nutri: 'Vitamine C', bienfait: 'Vitalité hivernale', prix: '2,80 €/kg', recettes: ['Nature', 'Salade', 'Confite'] },
  Kiwi: { kcal: 61, nutri: 'Vitamine C (record), fibres', bienfait: 'Immunité et transit', prix: '3,90 €/kg', recettes: ['Nature', 'Smoothie', 'Salade'] },
};

/** URL de recherche Marmiton dynamique (jamais d'URL de recette en dur). */
export function marmitonSearchUrl(recette: string, produit: string): string {
  return `https://www.marmiton.org/recettes/recherche.aspx?aqt=${encodeURIComponent(`${recette} ${produit}`)}`;
}

function resolveProduit(nom: string, type: ProduitType): ProduitResolu {
  return {
    nom,
    type,
    emoji: SAISON_IMG[nom] ?? '🧺',
    fiche: SAISON_PRODUITS[nom] ?? SAISON_FALLBACK,
  };
}

/** Produits de saison du mois (triés alphabétiquement, séparés légumes/fruits). */
export function getSaison(monthIndex: number): { legumes: ProduitResolu[]; fruits: ProduitResolu[] } {
  const cal = SAISON_CAL[monthIndex] ?? { legumes: [], fruits: [] };
  const sortFr = (a: string, b: string): number => a.localeCompare(b, 'fr');
  return {
    legumes: [...cal.legumes].sort(sortFr).map((n) => resolveProduit(n, 'legume')),
    fruits: [...cal.fruits].sort(sortFr).map((n) => resolveProduit(n, 'fruit')),
  };
}
