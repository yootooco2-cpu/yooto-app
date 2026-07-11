/**
 * HARNAIS DE VALIDATION SCIENTIFIQUE (mission GATE 2 → GATE FINAL).
 * Ancien moteur = attribution Google historique (cryptogramForMerchant).
 * Nouveau moteur = Hierarchical Multi-Evidence, GELÉ (aucune modification ici).
 * Auto-désactivé sans export. Écrit les rapports dans le scratchpad.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { classifyMerchant, type Decision } from '@/features/merchants/classification/engine';
import { cryptogramForMerchant, type CryptogramId } from '@/features/merchants/cryptograms';
import { parseMerchantRow } from '@/features/merchants/schema';
import type { Merchant } from '@/features/merchants/types';

const DATA =
  '/private/tmp/claude-501/-Users-jasoncombe/2e24c30e-4d3d-4a27-953f-14e22a8aea3f/scratchpad/merchants-full.json';

/** Vocabulaire commun (identique au moteur) pour comparer l'ancien système au nouveau. */
const CRYPTO_TO_NODE: Partial<Record<CryptogramId, string>> = {
  boulangerie: 'boulangeries', patisserie: 'patisseries', cafe: 'bars-cafes',
  restaurant: 'restaurants', marche: 'marches', primeur: 'primeurs',
  epicerie: 'epiceries', fromagerie: 'fromageries', caviste: 'cavistes',
  boucherie: 'boucheries', poissonnerie: 'poissonneries', traiteur: 'traiteurs',
  fleuriste: 'fleuristes', librairie: 'librairies', culture: 'culture',
  artisanat: 'artisanat', bienetre: 'bienetre', sport: 'bienetre',
  nature: 'nature', mobilite: 'mobilite', cooperative: 'cooperatives',
  producteur: 'producteurs',
};

/** PRNG déterministe (reproductibilité — pas de Math.random). */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Row { raw: Record<string, unknown>; m: Merchant; old: string | null; d: Decision }

(existsSync(DATA) ? describe : describe.skip)('validation scientifique — ancien vs nouveau moteur', () => {
  it('produit le diff exhaustif et les rapports', () => {
    const rows = JSON.parse(readFileSync(DATA, 'utf8')) as Record<string, unknown>[];
    const all: Row[] = rows.map((raw) => {
      const m = parseMerchantRow(raw);
      return { raw, m, old: CRYPTO_TO_NODE[cryptogramForMerchant(m)] ?? null, d: classifyMerchant(m) };
    });

    // ── LIVRABLE 1 : statistiques par catégorie
    const cats = new Set<string>();
    for (const r of all) { if (r.old) cats.add(r.old); if (r.d.category) cats.add(r.d.category); }
    const stat = [...cats].sort().map((c) => {
      const before = all.filter((r) => r.old === c).length;
      const after = all.filter((r) => r.d.category === c).length;
      return { categorie: c, avant: before, apres: after, delta: after - before,
               pct: before ? Math.round(((after - before) / before) * 100) : null };
    });
    const summary = {
      total: all.length,
      inchanges: all.filter((r) => r.old === r.d.category).length,
      reclasses: all.filter((r) => r.old !== r.d.category && r.d.category !== null).length,
      quarantaines: all.filter((r) => r.d.status === 'QUARANTAINE').length,
      nouvellement_categorises: all.filter((r) => r.old === null && r.d.category !== null).length,
      perdus: all.filter((r) => r.old !== null && r.d.category === null && r.d.status !== 'QUARANTAINE').length,
      contradictions: all.filter((r) => r.d.source === 'contradiction NAF/Google').length,
    };

    // ── LIVRABLE 2 : transitions complètes (avec preuves retenues ET ignorées)
    const ignored = (r: Row): string => {
      if (r.d.source.startsWith('NAF') && r.old && r.old !== r.d.category)
        return `signal Google historique → ${r.old} (préséance de la preuve officielle)`;
      if (r.d.source === 'NAF' && r.d.evidence.length === 1 && r.old === null)
        return 'aucun signal Google spécifique (générique ignoré par doctrine)';
      return '—';
    };
    const transitions = all
      .filter((r) => r.old !== r.d.category)
      .map((r) => ({
        id: r.raw.id, nom: r.m.name, ancienne: r.old, nouvelle: r.d.category,
        statut: r.d.status, confiance: r.d.confidence, source: r.d.source,
        preuves_retenues: r.d.evidence, preuves_ignorees: ignored(r), justification: r.d.explanation,
      }));

    // ── HYPOTHÈSE 3 : les NAF NULL
    const nulls = all.filter((r) => r.raw.naf_code == null);
    const h3 = {
      total_naf_null: nulls.length,
      null_avec_preuve_google_exploitable: nulls.filter((r) => r.d.source === 'Google' || r.d.source === 'texte').length,
      null_classes_medium: nulls.filter((r) => r.d.confidence === 'MEDIUM').length,
      null_en_quarantaine_malgre_preuve: nulls.filter((r) => r.d.status === 'QUARANTAINE' && (r.d.source === 'Google' || r.d.source === 'texte')).length,
      null_sans_aucune_preuve: nulls.filter((r) => r.d.source === 'aucune').length,
    };

    // ── GÉNÉRALISATION : contradictions réelles HORS référentiel
    const REF = ['animalis', 'cagette', 'minit', 'verchant', 'caveau', 'bus montpellier', 'cheese nan', 'magasin latino'];
    const isRef = (n: string) => REF.some((k) => n.toLowerCase().includes(k));
    const contradictionsHorsRef = all.filter((r) => r.d.source === 'contradiction NAF/Google' && !isRef(r.m.name));
    const nullGoogleHorsRef = nulls.filter((r) => r.d.source === 'Google' && !isRef(r.m.name)).slice(0, 3);

    // ── ERREURS STABLES : échantillon aléatoire reproductible d'accords
    const rand = mulberry32(42);
    const agreements = all.filter((r) => r.old !== null && r.old === r.d.category);
    const sample = [...agreements].sort(() => rand() - 0.5).slice(0, 20).map((r) => ({
      id: r.raw.id, nom: r.m.name, categorie: r.old, naf: r.raw.naf_code,
      google: r.m.rawCategory ?? r.m.category, confiance: r.d.confidence, source: r.d.source,
    }));

    // ── CAS EMBLÉMATIQUES présents dans le catalogue réel
    const emblematic = all.filter((r) => isRef(r.m.name)).map((r) => ({
      id: r.raw.id, nom: r.m.name, naf: r.raw.naf_code, ancienne: r.old,
      nouvelle: r.d.category, statut: r.d.status, confiance: r.d.confidence,
      preuves: r.d.evidence, justification: r.d.explanation,
    }));

    const OUT = `${DATA}.validation`;
    writeFileSync(`${OUT}-stats.json`, JSON.stringify({ summary, stat }, null, 1));
    writeFileSync(`${OUT}-transitions.json`, JSON.stringify(transitions, null, 1));
    writeFileSync(`${OUT}-h3-null.json`, JSON.stringify(h3, null, 1));
    writeFileSync(`${OUT}-generalisation.json`, JSON.stringify({
      contradictions_hors_referentiel: contradictionsHorsRef.map((r) => ({
        id: r.raw.id, nom: r.m.name, naf: r.raw.naf_code, google: r.m.rawCategory,
        preuves: r.d.evidence, justification: r.d.explanation })),
      null_google_hors_referentiel: nullGoogleHorsRef.map((r) => ({
        id: r.raw.id, nom: r.m.name, google: r.m.rawCategory, decision: r.d.category, confiance: r.d.confidence })),
    }, null, 1));
    writeFileSync(`${OUT}-erreurs-stables.json`, JSON.stringify(sample, null, 1));
    writeFileSync(`${OUT}-emblematiques.json`, JSON.stringify(emblematic, null, 1));

    console.log(JSON.stringify({ summary, h3, contradictions_hors_ref: contradictionsHorsRef.length }, null, 1));
    expect(all.length).toBe(rows.length);
    expect(summary.perdus).toBe(0); // aucune fiche perdue : quarantaine ou catégorie, jamais le vide
  });
});
