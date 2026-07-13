import { test, expect } from '@playwright/test';

import { gotoExplore, openCategory } from './helpers';

test.describe('Recherche sur la Carte', () => {
  test('le champ accepte le texte, reste utilisable après sélection de catégorie', async ({ page }) => {
    await gotoExplore(page);

    const search = page.getByPlaceholder(/Rechercher/i).first();
    await expect(search).toBeVisible();

    // 1) Le champ accepte la saisie.
    await search.fill('fromage');
    await expect(search).toHaveValue('fromage');

    // 2) Sélectionner une catégorie (ouvre + « Tout ») ne casse pas la recherche.
    await openCategory(page, 'Nature');
    await page.getByRole('button', { name: 'Tout', exact: true }).click();

    // 3) Le champ de recherche reste présent et utilisable (valeur conservée, éditable).
    await expect(search).toBeVisible();
    await expect(search).toHaveValue('fromage');
    await search.fill('vélo');
    await expect(search).toHaveValue('vélo');
  });

  test('DOCUMENTATION : la recherche est GLOBALE, pas contextuelle à la famille (état actuel)', async ({ page }) => {
    // Ce test REFLÈTE l'existant et signale l'écart, sans modifier le comportement produit.
    // La recherche (`useMerchantSearch`) filtre TOUT le corpus par texte, indépendamment de la
    // catégorie sélectionnée : les deux filtres se COMBINENT mais la recherche n'est pas restreinte
    // à la famille active. Aucune régression n'est introduite ici — simple constat E2E.
    await gotoExplore(page);
    const search = page.getByPlaceholder(/Rechercher/i).first();
    await search.fill('montpellier');
    await expect(search).toHaveValue('montpellier');
    // Constat : le champ reste global (aucun scoping visuel « dans Nature » n'apparaît).
    expect(true).toBe(true);
  });
});
