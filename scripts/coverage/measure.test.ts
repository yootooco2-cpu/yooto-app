/**
 * MESURE Vague 1 (outil ponctuel, lecture seule) — exécute les VRAIS prédicats de
 * navigation de l'app sur un export JSON du catalogue, périmètre Montpellier.
 * S'auto-désactive si l'export n'existe pas (aucun impact CI).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { CATEGORY_FAMILIES } from '@/features/merchants/categoryFamilies';
import { parseMerchantRow } from '@/features/merchants/schema';
import type { Merchant } from '@/features/merchants/types';

import { classifyNaf } from '../spt/score';

const DATA =
  '/private/tmp/claude-501/-Users-jasoncombe/2e24c30e-4d3d-4a27-953f-14e22a8aea3f/scratchpad/merchants-full.json';

(existsSync(DATA) ? describe : describe.skip)('mesure couverture Montpellier', () => {
  it('produit la matrice', () => {
    const rows = JSON.parse(readFileSync(DATA, 'utf8')) as Record<string, unknown>[];
    const MTP_CP = ['34000', '34070', '34080', '34090'];
    const inMtp = (r: Record<string, unknown>): boolean => {
      const city = String(r.city ?? '').toLowerCase();
      const addr = String(r.address ?? '');
      return city.includes('montpellier') || MTP_CP.some((cp) => addr.includes(` ${cp} `) || String(r.postal_code ?? '') === cp);
    };
    const mtp = rows.filter(inMtp);

    interface Row { raw: Record<string, unknown>; m: Merchant }
    const parsed: Row[] = mtp.map((raw) => ({ raw, m: parseMerchantRow(raw) }));

    const ferme = (r: Record<string, unknown>) => r.sirene_etat != null && r.sirene_etat !== 'A';
    const verifie = (r: Record<string, unknown>) => r.siret != null && r.sirene_etat === 'A';
    const preuve = (r: Record<string, unknown>) =>
      ferme(r) || (r.naf_code != null && classifyNaf(r.naf_code as string) === 'eloigne');
    const presentable = (r: Record<string, unknown>) =>
      (r.photo_url != null && r.google_rating != null && r.category != null) ||
      (verifie(r) && r.naf_code != null && r.latitude != null);
    const publiable = (r: Record<string, unknown>) => presentable(r) && !preuve(r);

    const out: string[] = [];
    const line = (depth: number, label: string, sel: Row[]) => {
      const pres = sel.length;
      const vis = sel.filter((x) => x.raw.status === 'active').length;
      const ver = sel.filter((x) => verifie(x.raw)).length;
      const pub = sel.filter((x) => publiable(x.raw)).length;
      const quar = sel.filter((x) => x.raw.status !== 'active').length;
      out.push(`${'  '.repeat(depth)}${label} | presents=${pres} | verifies=${ver} | publiables=${pub} | visibles=${vis} | quarantaine=${quar}`);
    };
    line(0, `MONTPELLIER (tous)`, parsed);
    for (const fam of CATEGORY_FAMILIES) {
      const famSel = parsed.filter((x) => fam.match?.(x.m));
      line(0, `【${fam.label}】`, famSel);
      for (const child of fam.children ?? []) {
        const sel = parsed.filter((x) => child.match?.(x.m));
        line(1, child.label, sel);
      }
    }
    writeFileSync(`${DATA}.matrix.txt`, out.join('\n'));
    expect(parsed.length).toBeGreaterThan(0);
  });
});
