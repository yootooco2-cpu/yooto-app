/**
 * Catalogue des missions MVP.
 *
 * Les identifiants de catégories sont TRANSMIS par le consommateur
 * (`MissionCatalogBindings`) : le domaine ne connaît ni la taxonomie v5,
 * ni `categoryFamilies.ts`, ni aucun libellé affiché. Les politiques
 * (essentiel, accessibilité) sont des hypothèses produit surchargables.
 */

import type { Mission, MissionId } from './domain/types';

export const MISSION_IDS: readonly MissionId[] = [
  'bread',
  'coffee',
  'water',
  'pharmacy',
  'accessible_toilet',
];

export interface MissionCategoryBinding {
  primaryCategoryIds: readonly string[];
  compatibleCategoryIds?: readonly string[];
}

export type MissionCatalogBindings = Readonly<Record<MissionId, MissionCategoryBinding>>;

export interface MissionPolicy {
  essential: boolean;
  requiresAccessibility: boolean;
}

/**
 * Politiques par défaut — hypothèses produit à confirmer sur le pilote :
 * une pharmacie et des toilettes accessibles ne tolèrent pas l'incertitude
 * d'ouverture ; pain/café/eau restent des missions de confort.
 */
export const DEFAULT_MISSION_POLICIES: Readonly<Record<MissionId, MissionPolicy>> = {
  bread: { essential: false, requiresAccessibility: false },
  coffee: { essential: false, requiresAccessibility: false },
  water: { essential: false, requiresAccessibility: false },
  pharmacy: { essential: true, requiresAccessibility: false },
  accessible_toilet: { essential: true, requiresAccessibility: true },
};

export function createMissionCatalog(
  bindings: MissionCatalogBindings,
  policyOverrides: Partial<Record<MissionId, Partial<MissionPolicy>>> = {},
): Readonly<Record<MissionId, Mission>> {
  const catalog = {} as Record<MissionId, Mission>;
  for (const id of MISSION_IDS) {
    const binding = bindings[id];
    const policy = { ...DEFAULT_MISSION_POLICIES[id], ...policyOverrides[id] };
    catalog[id] = {
      id,
      primaryCategoryIds: [...binding.primaryCategoryIds],
      compatibleCategoryIds: [...(binding.compatibleCategoryIds ?? [])],
      essential: policy.essential,
      requiresAccessibility: policy.requiresAccessibility,
    };
  }
  return catalog;
}
