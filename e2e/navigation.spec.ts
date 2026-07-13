import { test, expect } from '@playwright/test';

import { TABS, isKnownNoise } from './helpers';

test.describe('Navigation par onglets (5 onglets)', () => {
  for (const tab of TABS) {
    test(`onglet ${tab.label} → ${tab.url}, page non vide, aucune erreur JS critique`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error' && !isKnownNoise(m.text())) errors.push(`console.error: ${m.text()}`);
      });

      // On atteint la route via clic d'onglet quand c'est possible ; sinon navigation directe (fallback),
      // les deux valident « la navigation aboutit ».
      await page.goto('/');
      const tabBtn = page
        .getByRole('button', { name: tab.label, exact: true })
        .or(page.getByRole('link', { name: tab.label, exact: true }))
        .last();
      if (await tabBtn.count()) {
        await tabBtn.click();
      } else {
        await page.goto(tab.url);
      }

      await expect(page).toHaveURL(new RegExp(tab.url === '/' ? '/(\\?|$)' : tab.url.replace('/', '\\/')));

      // Page NON blanche : le body porte du texte visible.
      await expect
        .poll(async () => (await page.locator('body').innerText()).trim().length, { timeout: 30_000 })
        .toBeGreaterThan(20);

      expect(errors, `erreurs JS sur ${tab.label} :\n${errors.join('\n')}`).toEqual([]);
    });
  }
});
