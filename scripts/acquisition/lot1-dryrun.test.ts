/**
 * PHASE 4 — LOT 1 (Vignerons & Domaines, 25 candidats) — DRY-RUN À TROIS SORTIES.
 * Chaque candidat traverse les gates réels : dédup → état SIRENE → territoire →
 * moteur v1.1 (GELÉ) → SPT v1.1 → complétude voie VÉRIFIÉE.
 * AUCUNE ÉCRITURE. Auto-désactivé sans le fichier candidats.
 * Vocabulaire officiel : candidats → PASS (publiables) / QUARANTAINE / REJET.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { classifyMerchant } from '@/features/merchants/classification/engine';
import type { Merchant } from '@/features/merchants/types';

import { computeSptV11 } from '../spt/score';
import { receptionEvidence } from './accueil';

const DATA =
  '/private/tmp/claude-501/-Users-jasoncombe/2e24c30e-4d3d-4a27-953f-14e22a8aea3f/scratchpad/lot1-candidats.json';

interface Candidat {
  siret: string; nom: string; enseignes: string[] | null; adresse: string;
  naf: string; etat: string | null; latitude: string | number | null; longitude: string | number | null;
  date_creation: string | null; categorie_entreprise: string | null; nb_etablissements: number | null;
  siege_cp: string | null; est_ess: boolean; est_bio: boolean; rm: boolean;
  deja_en_base: boolean; non_diffusible: boolean; erreur?: string;
}

(existsSync(DATA) ? describe : describe.skip)('Lot 1 — dry-run trois sorties', () => {
  it('trie les 25 candidats par les gates réels', () => {
    const cands = JSON.parse(readFileSync(DATA, 'utf8')) as Candidat[];
    const out = cands.map((c) => {
      const displayName = c.enseignes?.[0] ?? c.nom;
      const m = {
        id: c.siret, name: displayName, category: 'shop', description: '',
        coordinates: { latitude: Number(c.latitude ?? 0), longitude: Number(c.longitude ?? 0) },
        distanceLabel: '—', isOpenNow: false, isProducer: false, isAccessible: false,
        hasRewards: false, pin: { x: 0, y: 0 }, nafCode: c.naf, sireneEtat: c.etat ?? undefined,
      } as Merchant;
      const decision = classifyMerchant(m, { estEss: c.est_ess });
      const spt = computeSptV11({
        sireneMatched: true, sireneEtat: c.etat, nafCode: c.naf,
        nbEtablissements: c.nb_etablissements, categorieEntreprise: c.categorie_entreprise,
        siegeCodePostal: c.siege_cp, dateCreation: c.date_creation,
        estBio: c.est_bio, estEss: c.est_ess, estSocieteMission: false,
        artisanRegistreMetiers: c.rm, googleRating: null,
      });

      // ── Les trois sorties (le REJET exige une preuve positive ; le doute va en quarantaine)
      let sortie: 'PASS' | 'QUARANTAINE' | 'REJET';
      const raisons: string[] = [];
      if (c.erreur) { sortie = 'QUARANTAINE'; raisons.push(`enrichissement en échec (${c.erreur}) — preuve manquante`); }
      else if (c.deja_en_base) { sortie = 'REJET'; raisons.push('doublon confirmé (SIRET déjà au catalogue)'); }
      else if (c.etat !== 'A') { sortie = 'REJET'; raisons.push(`établissement non actif (état ${c.etat})`); }
      else if (spt.preuvesNonPertinence.length > 0) { sortie = 'REJET'; raisons.push(...spt.preuvesNonPertinence); }
      else if (c.non_diffusible) { sortie = 'QUARANTAINE'; raisons.push('identité protégée [ND] — publication différée'); }
      else if (!c.latitude || !c.longitude) { sortie = 'QUARANTAINE'; raisons.push('coordonnées absentes — invisible sur la carte (voie VÉRIFIÉE incomplète)'); }
      else if (decision.status === 'QUARANTAINE') { sortie = 'QUARANTAINE'; raisons.push(`classification : ${decision.explanation}`); }
      else if (spt.bandeOperationnelle === 'HORS-MISSION') { sortie = 'QUARANTAINE'; raisons.push('SPT hors-mission — revue humaine (jamais un rejet sans preuve)'); }
      else {
        // RÈGLE DE CLASSE (GATE 3) : l'existence d'un acteur ≠ l'existence d'un lieu.
        const reception = receptionEvidence({ naf: c.naf, nom: c.nom, enseignes: c.enseignes, adresse: c.adresse });
        if (!reception.proven) { sortie = 'QUARANTAINE'; raisons.push(reception.missing!); }
        else {
          sortie = 'PASS';
          raisons.push(`voie VÉRIFIÉE complète · ${decision.source} → ${decision.category} · SPT ${spt.scoreOperationnel} ${spt.bandeOperationnelle}`);
          raisons.push(...reception.evidence.map((e) => `accueil : ${e}`));
        }
      }

      return {
        siret: c.siret, nom: displayName, denomination: c.nom, adresse: c.adresse, naf: c.naf,
        sortie, raisons,
        classification: { category: decision.category, confidence: decision.confidence, source: decision.source, evidence: decision.evidence },
        spt: { brut: spt.scoreBrut, operationnel: spt.scoreOperationnel, bande: spt.bandeOperationnelle,
               positives: spt.raisonsPositives, signalReseau: spt.signalReseau },
      };
    });
    const n = (s: string) => out.filter((x) => x.sortie === s).length;
    writeFileSync(`${DATA}.dryrun.json`, JSON.stringify({ PASS: n('PASS'), QUARANTAINE: n('QUARANTAINE'), REJET: n('REJET'), lots: out }, null, 1));
    console.log(`PASS=${n('PASS')} QUARANTAINE=${n('QUARANTAINE')} REJET=${n('REJET')}`);
    expect(out.length).toBe(cands.length);
  });
});
