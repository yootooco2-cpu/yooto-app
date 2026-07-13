import { test, expect } from '@playwright/test';

import { CATEGORIES, gotoExplore } from './helpers';

test.describe('Catégories principales visibles sur /explore', () => {
  test('les 7 familles figées sont présentes dans la barre', async ({ page }) => {
    await gotoExplore(page);
    for (const cat of CATEGORIES) {
      await expect(page.getByRole('button', { name: cat, exact: true })).toBeVisible();
    }
  });

  test('exactement ces 7 familles, aucune de plus (taxonomie figée)', async ({ page }) => {
    await gotoExplore(page);
    // Aucune 8e famille connue ne doit apparaître.
    for (const absent of ['Budget', 'Immobilier', 'Emploi', 'Santé']) {
      await expect(page.getByRole('button', { name: absent, exact: true })).toHaveCount(0);
    }
  });
});
