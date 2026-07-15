/**
 * Configuration de routage fauteuil roulant — injectable et versionnée.
 *
 * RÈGLE PRODUIT : les valeurs par défaut documentées par ORS (pente 6 %,
 * bordure 0,06 m, etc.) sont des réglages TECHNIQUES du fournisseur, PAS
 * une promesse de sécurité YOOTOO. Tant que `validationStatus` vaut
 * 'unvalidated', la configuration sert aux fixtures et simulations mais ne
 * doit jamais être présentée comme validée terrain — l'information est
 * conservée dans la provenance de chaque route produite.
 */

export type WheelchairValidationStatus = 'unvalidated' | 'pilot_validated';

export interface WheelchairRoutingParams {
  /** Pente maximale en % (valeurs ORS : 3, 6, 10, 15 ou 'any'). */
  maximumIncline: 3 | 6 | 10 | 15 | 'any';
  /** Hauteur maximale de bordure abaissée en mètres (0.03, 0.06, 0.1 ou 'any'). */
  maximumSlopedKerb: 0.03 | 0.06 | 0.1 | 'any';
  /** Largeur minimale de voie en mètres — optionnelle. */
  minimumWidth?: number;
  /** Surface minimale acceptée (vocabulaire ORS/OSM). */
  surfaceType: string;
  /** Régularité minimale acceptée (vocabulaire ORS/OSM). */
  smoothnessType: string;
  /** Qualité minimale de voie (vocabulaire ORS/OSM). */
  trackType: string;
}

export interface WheelchairRoutingConfig {
  params: WheelchairRoutingParams;
  validationStatus: WheelchairValidationStatus;
  /** Origine des valeurs — auditable (ex. 'ors_documented_defaults_unvalidated'). */
  source: string;
  /** Version de configuration — un changement de réglage incrémente la version. */
  version: number;
}

/**
 * Défauts techniques DOCUMENTÉS PAR ORS (vérifiés le 15/07/2026), marqués
 * explicitement NON VALIDÉS terrain. Ce ne sont pas des réglages YOOTOO.
 */
export const ORS_DOCUMENTED_DEFAULTS_UNVALIDATED: WheelchairRoutingConfig = {
  params: {
    maximumIncline: 6,
    maximumSlopedKerb: 0.06,
    surfaceType: 'cobblestone:flattened',
    smoothnessType: 'good',
    trackType: 'grade1',
  },
  validationStatus: 'unvalidated',
  source: 'ors_documented_defaults_unvalidated',
  version: 1,
};

export interface CreateWheelchairConfigInput {
  params?: Partial<WheelchairRoutingParams>;
  validationStatus?: WheelchairValidationStatus;
  source?: string;
  version?: number;
}

export function createWheelchairRoutingConfig(
  input: CreateWheelchairConfigInput = {},
): WheelchairRoutingConfig {
  return {
    params: { ...ORS_DOCUMENTED_DEFAULTS_UNVALIDATED.params, ...input.params },
    validationStatus: input.validationStatus ?? 'unvalidated',
    source: input.source ?? ORS_DOCUMENTED_DEFAULTS_UNVALIDATED.source,
    version: input.version ?? ORS_DOCUMENTED_DEFAULTS_UNVALIDATED.version,
  };
}
