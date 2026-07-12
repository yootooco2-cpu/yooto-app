/**
 * TEST DE RENDEMENT — enrichissement Google des fiches vérifiées nues.
 * Chaîne complète : nouvelle preuve Google → moteur v1.1 GELÉ (contradictions !) →
 * SPT (note) → gates. AUCUNE écriture ici — sorties pour l'application par paliers.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { classifyMerchant } from '@/features/merchants/classification/engine';
import type { Merchant } from '@/features/merchants/types';

const SCRATCH = '/private/tmp/claude-501/-Users-jasoncombe/2e24c30e-4d3d-4a27-953f-14e22a8aea3f/scratchpad';
const DATA = process.env.ENRICH_DATA ?? `${SCRATCH}/enrich-test-100.json`;

interface Enriched {
  id: number; name: string; naf: string; lat: number; lng: number; etat: string;
  place_id?: string; g_name?: string; rating?: number; reviews?: number; phone?: string;
  website?: string; types?: string[]; business_status?: string; g_lat?: number; g_lng?: number;
  photo_ref?: string; opening_hours?: unknown;
}

const distM = (la1: number, lo1: number, la2: number, lo2: number): number => {
  const p = Math.PI / 180;
  return 6371000 * Math.hypot((la2 - la1) * p, (lo2 - lo1) * p * Math.cos(((la1 + la2) / 2) * p));
};
const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ');
const tokens = (s: string): Set<string> => new Set(norm(s).split(' ').filter((t) => t.length > 2));
const overlap = (a: Set<string>, b: Set<string>): number => {
  if (!a.size || !b.size) return 0;
  let n = 0; for (const t of a) if (b.has(t)) n += 1;
  return n / Math.min(a.size, b.size);
};

(existsSync(DATA) ? describe : describe.skip)('rendement enrichissement — chaîne complète', () => {
  it('trie les 100 enrichis', () => {
    const rows = JSON.parse(readFileSync(DATA, 'utf8')) as Enriched[];
    const out = rows.map((r) => {
      const raisons: string[] = [];
      let sortie: 'PUBLIABLE' | 'QUARANTAINE' | 'REJET_REVELE' | 'INTROUVABLE';
      const gType = r.types?.find((t) => !['point_of_interest', 'establishment', 'store', 'food'].includes(t)) ?? r.types?.[0];
      const m = {
        id: String(r.id), name: r.name, category: 'shop', description: '',
        coordinates: { latitude: r.lat, longitude: r.lng }, distanceLabel: '—', isOpenNow: false,
        isProducer: false, isAccessible: false, hasRewards: false, pin: { x: 0, y: 0 },
        nafCode: r.naf, sireneEtat: 'A', rawCategory: gType, rawMerchantType: gType,
      } as Merchant;
      const decision = classifyMerchant(m);

      if (r.etat !== 'TROUVE') { sortie = 'INTROUVABLE'; raisons.push('aucune fiche Google exploitable — reste vérifiée nue'); }
      else if (r.business_status === 'CLOSED_PERMANENTLY') {
        sortie = 'REJET_REVELE';
        raisons.push('Google : fermé définitivement — DÉPUBLICATION PROPOSÉE (gate humain, fiche publiée)');
      } else if (
        r.g_lat != null && distM(r.lat, r.lng, r.g_lat!, r.g_lng!) > 300 &&
        overlap(tokens(r.name), tokens(r.g_name ?? '')) < 0.5
      ) {
        sortie = 'QUARANTAINE';
        raisons.push(`correspondance douteuse : « ${r.g_name} » à ${Math.round(distM(r.lat, r.lng, r.g_lat!, r.g_lng!))} m — pas d'écriture`);
      } else if (r.g_lat != null && distM(r.lat, r.lng, r.g_lat!, r.g_lng!) > 1000) {
        // GARDE PERMANENTE (classe « homonyme lointain », validée sur le cas Nine) :
        // incohérence géographique MANIFESTE → quarantaine, même à nom identique.
        sortie = 'QUARANTAINE';
        raisons.push(`incohérence géographique manifeste : homonyme « ${r.g_name} » à ${Math.round(distM(r.lat, r.lng, r.g_lat!, r.g_lng!))} m — quarantaine, jamais d'écrasement`);
      } else if (decision.status === 'QUARANTAINE') {
        sortie = 'QUARANTAINE';
        raisons.push(`contradiction moteur : ${decision.explanation}`);
      } else if (r.rating == null || !r.photo_ref) {
        sortie = 'QUARANTAINE';
        raisons.push(`enrichissement insuffisant (note: ${r.rating ?? '—'}, photo: ${r.photo_ref ? 'oui' : 'non'})`);
      } else {
        sortie = 'PUBLIABLE';
        raisons.push(`${decision.source} → ${decision.category} · ★${r.rating} (${r.reviews}) · photo ✓`);
      }
      return { ...r, sortie, raisons, categorie: decision.category, gType };
    });
    const n = (s: string) => out.filter((x) => x.sortie === s).length;
    writeFileSync(`${SCRATCH}/enrich-test-100.outcomes.json`, JSON.stringify(out, null, 1));
    console.log(`PUBLIABLE=${n('PUBLIABLE')} QUARANTAINE=${n('QUARANTAINE')} REJET_REVELE=${n('REJET_REVELE')} INTROUVABLE=${n('INTROUVABLE')}`);
    expect(out.length).toBe(rows.length);
  });
});
