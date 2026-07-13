import { test, expect, devices } from '@playwright/test';

import { gotoExplore } from './helpers';

const TARGETS = [
  { name: 'iPhone 13', device: devices['iPhone 13'] },
  { name: 'Pixel 7', device: devices['Pixel 7'] },
  { name: 'Desktop Chrome', device: devices['Desktop Chrome'] },
];

for (const { name, device } of TARGETS) {
  test.describe(`Responsive — ${name}`, () => {
    // On émule le VIEWPORT (taille, échelle, tactile, UA) sur Chromium — le projet est mono-navigateur.
    // `defaultBrowserType` (webkit pour iPhone) est retiré : Playwright l'interdit dans un describe et
    // forcerait un worker/navigateur non installé. Le layout responsive reste fidèlement testé.
    const { defaultBrowserType: _ignored, ...viewport } = device;
    test.use(viewport);

    test(`${name} : barre de catégories + nav inférieure visibles, pas de débordement horizontal majeur`, async ({ page }) => {
      await gotoExplore(page);

      // Barre de catégories visible (au moins la 1re famille, cliquable/accessible).
      const alim = page.getByRole('button', { name: 'Alimentation', exact: true });
      await expect(alim).toBeVisible();
      const box = await alim.boundingBox();
      expect(box, 'la famille a une boîte cliquable').not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);

      // Barre de navigation inférieure visible (un onglet identifiable).
      const carte = page.getByRole('button', { name: 'Carte', exact: true }).or(page.getByRole('link', { name: 'Carte', exact: true }));
      await expect(carte.last()).toBeVisible();

      // Pas de débordement horizontal MAJEUR (tolérance faible).
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'débordement horizontal').toBeLessThanOrEqual(2);

      // La carte (canvas Mapbox) n'est pas totalement masquée si présente.
      const canvas = page.locator('canvas.mapboxgl-canvas');
      if (await canvas.count()) {
        const cb = await canvas.first().boundingBox();
        expect(cb && cb.height > 0 && cb.width > 0).toBeTruthy();
      }
    });
  });
}
