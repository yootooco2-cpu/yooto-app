/**
 * Tests du catalogue de missions : identifiants de catégories injectés
 * (jamais la taxonomie v5), politiques par défaut et surcharges.
 */

import { FIXED_NOW_MS, TEST_MISSION_BINDINGS } from './fixtures';
import { createMissionCatalog, DEFAULT_MISSION_POLICIES, MISSION_IDS } from './missions';

describe('createMissionCatalog', () => {
  it('couvre les cinq missions MVP', () => {
    expect(MISSION_IDS).toEqual(['bread', 'coffee', 'water', 'pharmacy', 'accessible_toilet']);
    const catalog = createMissionCatalog(TEST_MISSION_BINDINGS);
    for (const id of MISSION_IDS) {
      expect(catalog[id].id).toBe(id);
      expect(catalog[id].primaryCategoryIds.length).toBeGreaterThan(0);
    }
  });

  it('reprend les identifiants transmis, sans référencer de libellé affiché', () => {
    const catalog = createMissionCatalog(TEST_MISSION_BINDINGS);
    expect(catalog.bread.primaryCategoryIds).toEqual(['test.cat.bakery']);
    expect(catalog.bread.compatibleCategoryIds).toEqual(['test.cat.grocery']);
    expect(catalog.pharmacy.compatibleCategoryIds).toEqual([]);
  });

  it('applique les politiques par défaut : pharmacy et accessible_toilet essentielles, accessible_toilet exige l’accessibilité', () => {
    const catalog = createMissionCatalog(TEST_MISSION_BINDINGS);
    expect(catalog.pharmacy.essential).toBe(true);
    expect(catalog.accessible_toilet.essential).toBe(true);
    expect(catalog.accessible_toilet.requiresAccessibility).toBe(true);
    expect(catalog.bread.essential).toBe(false);
    expect(catalog.bread.requiresAccessibility).toBe(false);
    expect(DEFAULT_MISSION_POLICIES.coffee).toEqual({
      essential: false,
      requiresAccessibility: false,
    });
  });

  it('les politiques restent surchargables — rien n’est figé dans le moteur', () => {
    const catalog = createMissionCatalog(TEST_MISSION_BINDINGS, {
      bread: { essential: true },
      pharmacy: { essential: false },
    });
    expect(catalog.bread.essential).toBe(true);
    expect(catalog.pharmacy.essential).toBe(false);
    // La surcharge partielle préserve le reste de la politique.
    expect(catalog.pharmacy.requiresAccessibility).toBe(false);
  });

  it('le temps de référence des fixtures est figé (déterminisme)', () => {
    expect(FIXED_NOW_MS).toBe(Date.UTC(2026, 6, 15, 10, 0, 0));
  });
});
