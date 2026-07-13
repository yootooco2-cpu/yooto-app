import { test, expect } from '@playwright/test';

import { isKnownNoise } from './helpers';

const PAGES = ['/explore', '/', '/merchants', '/chat', '/profile'];

test.describe('Erreurs console / réseau sur les pages principales', () => {
  for (const path of PAGES) {
    test(`${path} : aucune erreur applicative (pageerror / console.error / réseau critique)`, async ({ page }) => {
      const appErrors: string[] = [];
      const netErrors: string[] = [];

      page.on('pageerror', (e) => appErrors.push(`pageerror: ${e.message}`));
      page.on('console', (m) => {
        if (m.type() === 'error' && !isKnownNoise(m.text())) appErrors.push(`console.error: ${m.text()}`);
      });
      page.on('requestfailed', (r) => {
        const url = r.url();
        // On ignore les ressources non critiques (fonts/analytics tierces) ; on retient l'app + Supabase + tuiles.
        if (/rest\/v1|supabase|localhost:8081|mapbox/i.test(url)) {
          netErrors.push(`requestfailed: ${url.slice(0, 100)} — ${r.failure()?.errorText ?? '?'}`);
        }
      });
      page.on('response', (r) => {
        if (r.status() >= 500 && /localhost:8081|rest\/v1|supabase/i.test(r.url())) {
          netErrors.push(`HTTP ${r.status()}: ${r.url().slice(0, 100)}`);
        }
      });

      await page.goto(path, { waitUntil: 'domcontentloaded' });
      // Laisser l'app monter + les fetchs se déclencher (poll sur un contenu visible, pas de timeout arbitraire).
      await expect.poll(async () => (await page.locator('body').innerText()).trim().length, { timeout: 30_000 }).toBeGreaterThan(20);

      expect(appErrors, `erreurs applicatives sur ${path} :\n${appErrors.join('\n')}`).toEqual([]);
      expect(netErrors, `erreurs réseau critiques sur ${path} :\n${netErrors.join('\n')}`).toEqual([]);
    });
  }
});
