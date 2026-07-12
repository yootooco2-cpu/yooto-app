/**
 * RICHESSE DE FICHE GOOGLE (décision produit 12/07) — qualification AVANT dépense.
 *
 * Le critère n'est pas la photo seule : c'est la richesse réelle de la fiche.
 * Le SITE WEB N'EST JAMAIS OBLIGATOIRE — horaires et téléphone valent souvent plus.
 * Les niveaux pilotent la DÉPENSE d'enrichissement, jamais la publication :
 * un commerce vérifié SIRENE sans fiche Google (niveau D) reste publié voie VÉRIFIÉE —
 * le cœur différenciant de YOOTOO n'est jamais exclu.
 */

export interface FicheGoogle {
  etat: string; // 'TROUVE' | 'INTROUVABLE' | …
  photo_ref?: string | null;
  opening_hours?: unknown;
  phone?: string | null;
  website?: string | null;
  /** Adresse complète vérifiée (formatted_address concordante / candidat géolocalisé). */
  adresse_ok?: boolean;
  /** Type Google SPÉCIFIQUE (bakery, butcher…) — jamais un générique establishment/store. */
  types?: string[] | null;
  rating?: number | null;
  reviews?: number | null;
  description?: string | null;
}

const GENERIC_TYPES = new Set(['establishment', 'point_of_interest', 'store', 'food']);

export function hasSpecificType(types?: string[] | null): boolean {
  return Boolean(types?.some((t) => !GENERIC_TYPES.has(t)));
}

/** Pondérations = les étoiles de la décision (5/4/4/4/4/3/3/3/2). */
export function richesseScore(f: FicheGoogle): number {
  if (f.etat !== 'TROUVE') return 0;
  let s = 0;
  if (f.photo_ref) s += 5;
  if (f.opening_hours) s += 4;
  if (f.phone) s += 4;
  if (f.website) s += 4;
  if (f.adresse_ok) s += 4;
  if (hasSpecificType(f.types)) s += 3;
  if (typeof f.rating === 'number' && f.rating > 0) s += 3;
  if (typeof f.reviews === 'number' && f.reviews > 0) s += 3;
  if (f.description) s += 2;
  return s; // 0..32
}

export type RichesseLevel = 'A' | 'B' | 'C' | 'D';

/** Compte des informations FIABLES présentes (pour le seuil du niveau B). */
function infosFiables(f: FicheGoogle): number {
  return [
    Boolean(f.photo_ref),
    Boolean(f.opening_hours),
    Boolean(f.phone),
    Boolean(f.website),
    Boolean(f.adresse_ok),
    hasSpecificType(f.types),
    typeof f.rating === 'number' && f.rating > 0,
    typeof f.reviews === 'number' && f.reviews > 0,
    Boolean(f.description),
  ].filter(Boolean).length;
}

/**
 * A — Premium : photo + téléphone + horaires + adresse + ≥1 autre info → enrichir IMMÉDIATEMENT.
 * B — Riche  : ≥4 informations fiables (le site n'est PAS requis)   → enrichir si budget.
 * C — Minimale : peu d'informations                                  → reportée.
 * D — Aucune fiche Google                                            → voie SIRENE uniquement.
 */
export function richesseLevel(f: FicheGoogle): RichesseLevel {
  if (f.etat !== 'TROUVE') return 'D';
  const core = Boolean(f.photo_ref) && Boolean(f.phone) && Boolean(f.opening_hours) && Boolean(f.adresse_ok);
  const extras =
    Number(Boolean(f.website)) +
    Number(hasSpecificType(f.types)) +
    Number(typeof f.rating === 'number' && f.rating > 0) +
    Number(typeof f.reviews === 'number' && f.reviews > 0) +
    Number(Boolean(f.description));
  if (core && extras >= 1) return 'A';
  if (infosFiables(f) >= 4) return 'B';
  return 'C';
}
