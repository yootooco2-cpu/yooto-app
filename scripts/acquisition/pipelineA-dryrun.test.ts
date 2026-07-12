/**
 * PIPELINE A — DRY-RUN INDUSTRIEL (commerces de détail, accueil intrinsèque).
 * Découverte SIRENE → dédup (SIRET + nom/proximité vs base) → moteur v1.1 GELÉ →
 * SPT v1.1 → gates → PASS / QUARANTAINE / REJET. AUCUNE ÉCRITURE.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { classifyMerchant } from '@/features/merchants/classification/engine';
import type { Merchant } from '@/features/merchants/types';

import { computeSptV11 } from '../spt/score';
import { receptionEvidence } from './accueil';

// Chemins et zone paramétrés par env — les RÈGLES de gate, elles, ne bougent pas.
const SCRATCH = process.env.PIPELINE_SCRATCH
  ?? '/private/tmp/claude-501/-Users-jasoncombe/2e24c30e-4d3d-4a27-953f-14e22a8aea3f/scratchpad';
const DATA = process.env.PIPELINE_CANDIDATS ?? `${SCRATCH}/pipelineA-candidats.json`;
const BASE = process.env.PIPELINE_BASE ?? `${SCRATCH}/merchants-full.json`;
const OUT = process.env.PIPELINE_OUT ?? `${SCRATCH}/pipelineA-dryrun.json`;
const ZONE_CITY = process.env.ZONE_CITY ?? 'Montpellier';
const ZONE_CP = process.env.ZONE_CP ?? '34000';

interface Candidat {
  siret: string; nom: string; enseignes: string[] | null; adresse: string; naf: string;
  etat: string; latitude: string | number; longitude: string | number; date_creation: string | null;
  categorie_entreprise: string | null; nb_etablissements: number | null; siege_cp: string | null;
  est_ess: boolean; est_bio: boolean; rm: boolean; non_diffusible: boolean;
}

const norm = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = (s: string): Set<string> => new Set(norm(s).split(' ').filter((t) => t.length > 2));
const overlap = (a: Set<string>, b: Set<string>): number => {
  if (!a.size || !b.size) return 0;
  let n = 0;
  for (const t of a) if (b.has(t)) n += 1;
  return n / Math.min(a.size, b.size);
};
const distM = (la1: number, lo1: number, la2: number, lo2: number): number => {
  const p = Math.PI / 180;
  const x = (la2 - la1) * p;
  const y = (lo2 - lo1) * p * Math.cos(((la1 + la2) / 2) * p);
  return 6371000 * Math.hypot(x, y);
};
/** Casse d'affichage : les dénominations SIRENE sont en CAPITALES. */
const displayCase = (s: string): string =>
  s.replace(/\p{L}+/gu, (w) => (w.length > 2 ? w[0] + w.slice(1).toLowerCase() : w.toLowerCase()))
   .replace(/^\p{Ll}/u, (c) => c.toUpperCase());

(existsSync(DATA) && existsSync(BASE) ? describe : describe.skip)('Pipeline A — dry-run', () => {
  it('produit les trois sorties et les charges d’insertion', () => {
    const cands = JSON.parse(readFileSync(DATA, 'utf8')) as Candidat[];
    const base = (JSON.parse(readFileSync(BASE, 'utf8')) as Record<string, unknown>[]).map((r) => ({
      id: r.id, name: String(r.name ?? ''), siret: r.siret as string | null,
      lat: Number(r.latitude ?? 0), lng: Number(r.longitude ?? 0), tok: tokens(String(r.name ?? '')),
    }));
    const baseSirets = new Set(base.map((b) => b.siret).filter(Boolean));

    const out = cands.map((c) => {
      const displayName = displayCase(c.enseignes?.[0] ?? c.nom.replace(/\s*\([^)]*\)\s*$/, ''));
      const lat = Number(c.latitude); const lng = Number(c.longitude);
      const raisons: string[] = [];
      let sortie: 'PASS' | 'QUARANTAINE' | 'REJET' = 'PASS';

      const m = {
        id: c.siret, name: displayName, category: 'shop', description: '',
        coordinates: { latitude: lat, longitude: lng }, distanceLabel: '—', isOpenNow: false,
        isProducer: false, isAccessible: false, hasRewards: false, pin: { x: 0, y: 0 },
        nafCode: c.naf, sireneEtat: c.etat,
      } as Merchant;
      const decision = classifyMerchant(m, { estEss: c.est_ess });
      const spt = computeSptV11({
        sireneMatched: true, sireneEtat: c.etat, nafCode: c.naf,
        nbEtablissements: c.nb_etablissements, categorieEntreprise: c.categorie_entreprise,
        siegeCodePostal: c.siege_cp, dateCreation: c.date_creation,
        estBio: c.est_bio, estEss: c.est_ess, estSocieteMission: false,
        artisanRegistreMetiers: c.rm, googleRating: null,
      });
      const reception = receptionEvidence({ naf: c.naf, nom: c.nom, enseignes: c.enseignes, adresse: c.adresse });

      // Dédup : SIRET, puis nom+proximité contre la base réelle.
      const dupName = base.find((b) => distM(lat, lng, b.lat, b.lng) < 150 && overlap(tokens(displayName), b.tok) >= 0.6);
      const dupNear = base.find((b) => distM(lat, lng, b.lat, b.lng) < 25);
      if (baseSirets.has(c.siret)) { sortie = 'REJET'; raisons.push('doublon confirmé : SIRET déjà au catalogue'); }
      else if (dupName) { sortie = 'REJET'; raisons.push(`doublon confirmé : « ${dupName.name} » (#${dupName.id}) au même endroit`); }
      else if (spt.preuvesNonPertinence.length > 0) { sortie = 'REJET'; raisons.push(...spt.preuvesNonPertinence); }
      else if (c.non_diffusible) { sortie = 'QUARANTAINE'; raisons.push('identité protégée [ND]'); }
      else if (dupNear) { sortie = 'QUARANTAINE'; raisons.push(`doublon POSSIBLE : « ${dupNear.name} » (#${dupNear.id}) à <25 m — revue`); }
      else if (decision.status === 'QUARANTAINE') { sortie = 'QUARANTAINE'; raisons.push(`classification : ${decision.explanation}`); }
      else if (spt.bandeOperationnelle === 'HORS-MISSION') { sortie = 'QUARANTAINE'; raisons.push('SPT hors-mission — revue'); }
      else if (!reception.proven) { sortie = 'QUARANTAINE'; raisons.push(reception.missing!); }
      else { raisons.push(`${decision.source} → ${decision.category} · SPT ${spt.scoreOperationnel} ${spt.bandeOperationnelle} · ${reception.evidence[0]}`); }

      return {
        sortie, raisons, siret: c.siret, nom: displayName, naf: c.naf, adresse: c.adresse,
        categorie: decision.category, confiance: decision.confidence,
        insert: sortie === 'PASS' ? {
          name: displayName, siret: c.siret, naf_code: c.naf, sirene_etat: 'A',
          sirene_nb_etablissements: c.nb_etablissements, sirene_date_creation: c.date_creation,
          latitude: lat, longitude: lng, address: displayCase(c.adresse),
          city: displayCase((c.adresse.match(/\b\d{5}\b\s+(.+?)\s*$/) ?? [, ZONE_CITY])[1]!),
          postal_code: (c.adresse.match(/\b(\d{5})\b/) ?? [])[1] ?? ZONE_CP,
          est_ess: c.est_ess || null, est_bio: c.est_bio || null,
          source: 'sirene_first_pipeline_a', status: 'active', google_place_id: null,
          sirene_synced_at: null as string | null,
        } : null,
      };
    });
    const n = (s: string) => out.filter((x) => x.sortie === s).length;
    writeFileSync(OUT, JSON.stringify({ PASS: n('PASS'), QUARANTAINE: n('QUARANTAINE'), REJET: n('REJET'), lots: out }, null, 1));
    console.log(`candidats=${out.length} PASS=${n('PASS')} QUARANTAINE=${n('QUARANTAINE')} REJET=${n('REJET')}`);
    expect(out.length).toBe(cands.length);
  });
});
