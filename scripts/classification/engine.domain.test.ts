/**
 * TEST DE DOMAINE (Loi 8 / chapitre 8) — le moteur est confronté aux DONNÉES RÉELLES,
 * pas seulement à la règle écrite. S'auto-désactive sans export (aucun impact CI).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { classifyMerchant, type Decision } from '@/features/merchants/classification/engine';
import { parseMerchantRow } from '@/features/merchants/schema';

const DATA =
  '/private/tmp/claude-501/-Users-jasoncombe/2e24c30e-4d3d-4a27-953f-14e22a8aea3f/scratchpad/merchants-full.json';

(existsSync(DATA) ? describe : describe.skip)('domaine réel — catalogue complet', () => {
  it('chaque fiche reçoit une décision explicable ; aucune ne devient invisible ; reproductible', () => {
    const rows = JSON.parse(readFileSync(DATA, 'utf8')) as Record<string, unknown>[];
    const decisions: { id: unknown; d: Decision }[] = [];
    const unmappedNaf = new Map<string, number>();
    for (const raw of rows) {
      const merchant = parseMerchantRow(raw);
      const d = classifyMerchant(merchant);
      decisions.push({ id: raw.id, d });
      // Invariants sur données réelles :
      expect(d.explanation.length).toBeGreaterThan(20);
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(d.confidence);
      // Aucune fiche invisible : une décision sans catégorie est TOUJOURS une quarantaine (file), jamais un rejet.
      if (d.category === null) expect(d.status).toBe('QUARANTAINE');
      // Reproductibilité sur données réelles.
      expect(classifyMerchant(merchant)).toEqual(d);
      const naf = raw.naf_code as string | null;
      if (naf && d.evidence.join(' ').includes('non cartographié')) {
        unmappedNaf.set(naf, (unmappedNaf.get(naf) ?? 0) + 1);
      }
    }
    const stats = {
      total: decisions.length,
      HIGH: decisions.filter((x) => x.d.confidence === 'HIGH').length,
      MEDIUM: decisions.filter((x) => x.d.confidence === 'MEDIUM').length,
      LOW: decisions.filter((x) => x.d.confidence === 'LOW').length,
      QUARANTAINE: decisions.filter((x) => x.d.status === 'QUARANTAINE').length,
      naf_non_cartographies: [...unmappedNaf.entries()].sort((a, b) => b[1] - a[1]),
    };
    writeFileSync(`${DATA}.classification-domain.json`, JSON.stringify(stats, null, 1));
    expect(decisions.length).toBe(rows.length); // aucune fiche perdue
  });
});
