import { test, expect } from '@playwright/test';

import { gotoExplore, openCategory, readStablePanel } from './helpers';

/** Boutons-cartes de la bande « meilleures adresses » (visible seulement si une catégorie filtre). */
function stripCards(page: import('@playwright/test').Page) {
  return page.getByTestId('top-category-strip').getByRole('button');
}

/** Clique une ligne du panneau ouvert (portée au panneau → jamais ambigu avec la barre). */
async function clickPanelRow(page: import('@playwright/test').Page, label: string) {
  await page.getByTestId('category-panel').getByRole('button', { name: label, exact: true }).click();
}

test.describe('Filtrage par catégorie : la sélection applique un prédicat à la carte', () => {
  test('état initial : carte nue → aucune bande « meilleures adresses »', async ({ page }) => {
    await gotoExplore(page);
    // Aucune intention (ni catégorie ni recherche) → la bande n'est pas rendue (TopCategoryStrip = null).
    await expect(page.getByTestId('top-category-strip')).toHaveCount(0);
  });

  test('sélectionner « Tout » d’une famille fait apparaître la bande, la désélectionner la retire', async ({ page }) => {
    await gotoExplore(page);
    await openCategory(page, 'Alimentation');
    await readStablePanel(page); // corpus reflété avant de sélectionner

    // Sélection « Tout » → prédicat famille appliqué → la bande apparaît avec au moins une adresse.
    await clickPanelRow(page, 'Tout');
    await expect(page.getByTestId('top-category-strip')).toBeVisible();
    await expect.poll(async () => await stripCards(page).count(), { timeout: 15_000 }).toBeGreaterThan(0);

    // Re-sélection de « Tout » (toggle OFF) → plus d'intention → la bande disparaît.
    await openCategory(page, 'Alimentation');
    await readStablePanel(page);
    await clickPanelRow(page, 'Tout');
    await expect(page.getByTestId('top-category-strip')).toHaveCount(0);
  });

  test('une sous-catégorie précise filtre : le nb d’adresses de la bande = le compteur du panneau', async ({ page }) => {
    await gotoExplore(page);
    await openCategory(page, 'Nature');
    const rows = await readStablePanel(page);

    // On choisit une feuille (hors « Tout ») dont le compteur est dans [1, 12] : sous le plafond de la
    // bande (12), le nb de cartes doit alors ÉGALER le compteur — même corpus (`results`), même prédicat.
    const leaf = rows
      .filter((r) => r.label !== 'Tout' && r.count !== null && r.count! >= 1 && r.count! <= 12)
      .sort((a, b) => a.count! - b.count!)[0];
    expect(leaf, 'une sous-catégorie exploitable (compteur 1..12) existe').toBeTruthy();

    await clickPanelRow(page, leaf!.label);
    await expect(page.getByTestId('top-category-strip')).toBeVisible();
    // Égalité stricte : la carte n'expose que les commerces de cette sous-catégorie, ni plus ni moins.
    await expect
      .poll(async () => await stripCards(page).count(), { timeout: 15_000 })
      .toBe(leaf!.count);
  });
});
