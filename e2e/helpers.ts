import { type Page, expect } from '@playwright/test';

/** Les 7 familles FIGÉES (source : categoryFamilies.ts, non modifié). */
export const CATEGORIES = [
  'Alimentation',
  'Restaurants',
  'Bien-être',
  'Artisanat',
  'Culture',
  'Mobilité',
  'Nature',
] as const;

/** Onglets réels (Expo Router `(tabs)/_layout.tsx`). */
export const TABS = [
  { label: 'Accueil', url: '/' },
  { label: 'Carte', url: '/explore' },
  { label: 'Commerçants', url: '/merchants' },
  { label: 'Chat', url: '/chat' },
  { label: 'Profil', url: '/profile' },
] as const;

/**
 * Avertissements DEV connus et documentés (React Native Web / Expo / WebGL headless) —
 * ignorés par le test console-errors. Toute autre erreur applicative fait échouer.
 */
export const KNOWN_DEV_NOISE: RegExp[] = [
  /Require cycle:/i, // cycle require RN toléré (avertissement, non bloquant)
  /"shadow\*" style props are deprecated/i,
  /"textShadow\*" style props are deprecated/i,
  /style\.tintColor is deprecated/i,
  /Download the React DevTools/i,
  /GL Driver Message|ReadPixels|WebGL/i, // GPU logiciel en headless
  /Development-level warnings|Running application/i,
];

export function isKnownNoise(text: string): boolean {
  return KNOWN_DEV_NOISE.some((re) => re.test(text));
}

/**
 * Ouvre /explore, attend le menu catégories PUIS le chargement du corpus (réponse Supabase
 * merchants, enregistrée AVANT la navigation) → les compteurs sont prêts sans timeout arbitraire.
 * Le `.catch` couvre le cas (rare en test : page fraîche) où la donnée serait déjà en cache.
 */
export async function gotoExplore(page: Page): Promise<void> {
  const corpus = page
    .waitForResponse((r) => /rest\/v1\/merchants/i.test(r.url()) && r.status() < 400, { timeout: 30_000 })
    .catch(() => null);
  await page.goto('/explore');
  await expect(page.getByRole('button', { name: 'Alimentation', exact: true })).toBeVisible({ timeout: 45_000 });
  await corpus;
}

/** Clique une famille et attend l'ouverture de son panneau déroulant. */
export async function openCategory(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name, exact: true }).click();
  await expect(page.getByTestId('category-panel')).toBeVisible();
}

export interface PanelRow {
  label: string;
  count: number | null;
}

/** Lit les lignes du panneau ouvert : { label, count } (le compteur = chiffres en fin de ligne). */
export async function readPanelRows(page: Page): Promise<PanelRow[]> {
  const buttons = page.getByTestId('category-panel').getByRole('button');
  const n = await buttons.count();
  const rows: PanelRow[] = [];
  for (let i = 0; i < n; i++) {
    // Les icônes (chevron, coche…) rendues par @expo/vector-icons sont des glyphes de la zone
    // Private Use (U+E000–U+F8FF) : on les retire pour que le compteur redevienne le dernier
    // segment. Les lettres accentuées (é = U+00E9, etc.) sont hors de cette zone → préservées.
    const raw = ((await buttons.nth(i).textContent()) ?? '')
      .replace(/[-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!raw) continue;
    const m = raw.match(/(\d+)\s*$/);
    rows.push({ label: raw.replace(/\d+\s*$/, '').trim(), count: m ? Number(m[1]) : null });
  }
  return rows;
}

/**
 * Lit un INSTANTANÉ COHÉRENT du panneau : poll (sans timeout arbitraire) jusqu'à ce que le corpus
 * soit reflété — au moins une ligne « Tout » + une sous-ligne, ET *toutes* les lignes visibles
 * portent un compteur numérique. Le composant ne rend un compteur que lorsque le corpus est chargé
 * (`hasCounts`) ; un compteur manquant est donc un état de chargement TRANSITOIRE, jamais l'état
 * stable. On asserte ensuite sur CE même instantané → plus de course de lecture entre deux rendus.
 */
export async function readStablePanel(page: Page, timeout = 40_000): Promise<PanelRow[]> {
  let last: PanelRow[] = [];
  await expect
    .poll(
      async () => {
        try {
          last = await readPanelRows(page);
        } catch {
          return false; // panneau en cours de re-render → on repolle
        }
        if (last.length < 2) return false;
        const tout = last.find((r) => r.label === 'Tout');
        if (!tout || tout.count === null) return false;
        return last.every((r) => r.count !== null); // toutes les lignes visibles ont leur compteur
      },
      { timeout },
    )
    .toBe(true);
  return last;
}
