// photoSelection — logique PURE de sélection des marqueurs photo (P0 lisibilité carte).
//
// Réduit la densité visuelle : seuls les commerces PRIORITAIRES obtiennent un marqueur photo
// complet (40px) ; les autres restent visibles en pin compact (couche GL) et/ou regroupés en
// cluster. Le commerce SÉLECTIONNÉ est toujours promu en marqueur photo.
//
// Fonction pure et déterministe → testable sans dépendance carte / React Native.

/** Champs minimaux nécessaires au classement (sous-ensemble des props GeoJSON). */
export interface RankablePoint {
  id: string;
  /** URL de photo réelle, ou '' si aucune (déjà filtrée par getMerchantCoverPhoto). */
  photo: string;
  /** Note (0–5). */
  rating: number;
  /** Producteur local (0 | 1). */
  producer: number;
}

/**
 * Priorité d'affichage en marqueur photo. La présence d'une VRAIE photo domine (« vend »
 * visuellement), puis le statut producteur, puis la note. Déterministe.
 */
export function photoPriority(p: RankablePoint): number {
  const hasPhoto = p.photo !== '' ? 1 : 0;
  return hasPhoto * 100 + p.producer * 10 + Math.max(0, Math.min(5, p.rating));
}

/**
 * Sélectionne les commerces à afficher en marqueur photo :
 *  - seuls ceux ayant une vraie photo sont éligibles (les autres → pin compact) ;
 *  - triés par priorité décroissante (départage stable par id) ;
 *  - plafonnés à `cap` pour garder la carte lisible ;
 *  - le `selectedId` est TOUJOURS inclus (même sans photo / au-delà du cap).
 *
 * Ne masque JAMAIS un commerce : les non-sélectionnés restent visibles via la couche pin
 * compacte (et/ou un cluster). Retourne un sous-ensemble de `points`.
 */
export function selectPhotoMarkers<T extends RankablePoint>(
  points: T[],
  opts: { cap: number; selectedId?: string | null },
): T[] {
  const { cap, selectedId } = opts;
  const eligible = points.filter((p) => p.photo !== '');
  const ranked = [...eligible].sort(
    (a, b) => photoPriority(b) - photoPriority(a) || a.id.localeCompare(b.id),
  );
  const chosen = ranked.slice(0, Math.max(0, cap));
  const chosenIds = new Set(chosen.map((p) => p.id));

  // Le commerce sélectionné est toujours un marqueur photo (mise en avant garantie).
  if (selectedId) {
    const sel = points.find((p) => p.id === selectedId);
    if (sel && !chosenIds.has(sel.id)) chosen.push(sel);
  }
  return chosen;
}
