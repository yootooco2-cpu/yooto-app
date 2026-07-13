import { test, expect } from '@playwright/test';

import { gotoExplore, openCategory, readStablePanel } from './helpers';

/**
 * Totaux du RÉFÉRENTIEL (categoryFamilies.ts = source unique, taxonomie figée) — niveau 2.
 * Artisanat = 12 FAMILLES (chacune avec ses métiers au niveau 3). Ces nombres sont des GARDES :
 * toute modification de la taxonomie figée fera échouer le test (comportement voulu).
 */
const EXPECTED_SUBCATEGORIES: Record<string, number> = {
  'Bien-être': 8,
  Mobilité: 7,
  Culture: 10,
  Nature: 10,
  Artisanat: 12,
};

const EMPTY_NOTICE = 'Aucun commerce disponible actuellement dans cette sous-catégorie.';

/** Bouton d'une ligne du panneau, ciblé par son libellé (portée au panneau → jamais ambigu). */
function panelRow(page: import('@playwright/test').Page, label: string) {
  return page.getByTestId('category-panel').getByRole('button', { name: label, exact: true });
}

test.describe('Navigation catégories : référentiel intégral, 0 atténués, message clair', () => {
  for (const [fam, total] of Object.entries(EXPECTED_SUBCATEGORIES)) {
    test(`${fam} : les ${total} sous-catégories du référentiel restent toutes visibles`, async ({ page }) => {
      await gotoExplore(page);
      await openCategory(page, fam);
      const rows = await readStablePanel(page);

      const subs = rows.filter((r) => r.label !== 'Tout');
      // Référentiel INTÉGRAL : plus aucun masquage des sous-catégories à 0.
      expect(subs.length, `${fam} affiche toutes ses sous-catégories du référentiel`).toBe(total);

      // « Tout » toujours en première position, avec son compteur.
      const tout = rows.find((r) => r.label === 'Tout');
      expect(tout, '« Tout » présent').toBeTruthy();
      expect(tout!.count, '« Tout » a un compteur').not.toBeNull();

      // Chaque sous-catégorie porte un compteur numérique (0 compris) — aucune sans nombre.
      for (const s of subs) {
        expect(s.count, `${fam} › ${s.label} affiche un compteur`).not.toBeNull();
        expect(s.count!, `${fam} › ${s.label} a un compteur >= 0`).toBeGreaterThanOrEqual(0);
      }
    });
  }

  test('les sous-catégories à 0 sont affichées mais visuellement atténuées', async ({ page }) => {
    await gotoExplore(page);
    await openCategory(page, 'Bien-être'); // famille avec de nombreux 0
    const rows = await readStablePanel(page);

    const zero = rows.find((r) => r.label !== 'Tout' && r.count === 0);
    expect(zero, 'au moins une sous-catégorie à 0 est présente et visible').toBeTruthy();

    // Distinction visuelle claire : opacité réduite sur la ligne à 0.
    const opacity = await panelRow(page, zero!.label).evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(opacity, `${zero!.label} est atténuée (opacité < 1)`).toBeLessThan(1);
  });

  test('cliquer une sous-catégorie à 0 affiche un message clair, sans filtre vide silencieux', async ({ page }) => {
    await gotoExplore(page);
    await openCategory(page, 'Nature');
    const rows = await readStablePanel(page);

    const zero = rows.find((r) => r.label !== 'Tout' && r.count === 0);
    expect(zero, 'une sous-catégorie à 0 existe dans Nature').toBeTruthy();

    await panelRow(page, zero!.label).click();

    // Message explicite (texte exact), panneau toujours ouvert.
    const notice = page.getByTestId('category-empty-notice');
    await expect(notice).toBeVisible();
    // toContainText : la bannière porte aussi une icône décorative (glyphe) devant le texte.
    await expect(notice).toContainText(EMPTY_NOTICE);

    // AUCUN filtre appliqué → pas de bande « meilleures adresses » (jamais de carte vide silencieuse).
    await expect(page.getByTestId('top-category-strip')).toHaveCount(0);
  });

  test('une sous-catégorie NON vide reste pleinement utilisable (filtre appliqué)', async ({ page }) => {
    await gotoExplore(page);
    await openCategory(page, 'Nature');
    const rows = await readStablePanel(page);

    const filled = rows.find((r) => r.label !== 'Tout' && (r.count ?? 0) > 0);
    expect(filled, 'une sous-catégorie avec résultats existe dans Nature').toBeTruthy();

    await panelRow(page, filled!.label).click();
    // Sélection effective → la bande « meilleures adresses » apparaît.
    await expect(page.getByTestId('top-category-strip')).toBeVisible();
  });

  test('changer de famille remplace proprement le panneau', async ({ page }) => {
    await gotoExplore(page);
    await openCategory(page, 'Nature');
    await readStablePanel(page);
    await openCategory(page, 'Culture');
    await expect
      .poll(async () => (await readStablePanel(page)).some((r) => r.label === 'Librairies'), { timeout: 30_000 })
      .toBe(true);
  });
});
