/**
 * SPT v1.1 — tests de comportement et contre-exemples anti-surapprentissage.
 * Aucun test ne repose sur un NOM de commerce : uniquement des profils de preuves.
 */
import {
  computeSptV10,
  computeSptV11,
  proposeAction,
  type SptInput,
} from './score';

/** Profil neutre : aucune donnée SIRENE, aucun signal. */
const base: SptInput = {
  sireneMatched: false,
  sireneEtat: null,
  nafCode: null,
  nbEtablissements: null,
  categorieEntreprise: null,
  siegeCodePostal: null,
  dateCreation: null,
  estBio: false,
  estEss: false,
  estSocieteMission: false,
  artisanRegistreMetiers: false,
  googleRating: null,
};

const verified = (over: Partial<SptInput>): SptInput => ({
  ...base,
  sireneMatched: true,
  sireneEtat: 'A',
  ...over,
});

describe('SPT v1.1 — profils de calibration', () => {
  test('commerce indépendant vérifié (mono-étab, NAF cœur, ancré) → MISSIONNAIRE', () => {
    const r = computeSptV11(verified({
      nbEtablissements: 1, categorieEntreprise: 'PME', nafCode: '47.25Z',
      siegeCodePostal: '34000', dateCreation: '2012-04-01', googleRating: 4.6,
    }));
    expect(r.scoreBrut).toBe(25 + 20 + 25 + 0 + 10);
    expect(r.bandeOperationnelle).toBe('MISSIONNAIRE');
    expect(r.signalReseau).toBe('SIGNAL_RESEAU_NON_ETABLI');
  });

  test('producteur (NAF 01.) → anneau cœur +25', () => {
    const r = computeSptV11(verified({ nbEtablissements: 1, nafCode: '01.49Z' }));
    expect(r.raisonsPositives.join(' ')).toContain('NAF cœur');
    expect(r.scoreBrut).toBeGreaterThanOrEqual(50);
  });

  test('artisan (registre des métiers) et bio et ESS → engagements plafonnés à 20', () => {
    const r = computeSptV11(verified({
      nbEtablissements: 1, nafCode: '10.71C',
      estBio: true, artisanRegistreMetiers: true, estEss: true,
    }));
    // 12 + 10 + 8 = 30 → plafonné : le score total reste 25+0+25+20 = 70.
    expect(r.scoreBrut).toBe(70);
  });

  test('commerce bio seul → +12 ; acteur ESS seul → +8', () => {
    const bio = computeSptV11(verified({ nbEtablissements: 1, nafCode: '47.29Z', estBio: true }));
    const ess = computeSptV11(verified({ nbEtablissements: 1, nafCode: '47.29Z', estEss: true }));
    expect(bio.scoreBrut - ess.scoreBrut).toBe(4); // 12 - 8
  });
});

describe('Faille ② — le silence ne punit pas (plancher opérationnel)', () => {
  test('non vérifié mais présentable → plancher COMPATIBLE, score opérationnel ≥ 35', () => {
    const r = computeSptV11({ ...base, googleRating: 4.6 });
    expect(r.scoreBrut).toBe(8 + 5 + 8 + 0 + 10); // 31 : valeur diagnostique conservée
    expect(r.bandeBrute).toBe('HORS-MISSION');
    expect(r.plancherApplique).toBe(true);
    expect(r.scoreOperationnel).toBeGreaterThanOrEqual(35);
    expect(r.bandeOperationnelle).toBe('COMPATIBLE');
    expect(r.raisonDuPlancher).toContain('silence');
    expect(r.confiance).toBe('basse');
  });

  test('donnée SIRENE absente → aucune preuve de non-pertinence produite', () => {
    const r = computeSptV11(base);
    expect(r.preuvesNonPertinence).toHaveLength(0);
    expect(r.bandeOperationnelle).toBe('COMPATIBLE');
  });

  test('score faible AVEC preuve (NAF éloigné vérifié) → HORS-MISSION maintenu', () => {
    const r = computeSptV11(verified({
      nbEtablissements: 4, nafCode: '56.10C', dateCreation: '2025-01-01',
      siegeCodePostal: '34000',
    }));
    expect(r.scoreBrut).toBeLessThan(35);
    expect(r.plancherApplique).toBe(false);
    expect(r.bandeOperationnelle).toBe('HORS-MISSION');
    expect(r.preuvesNonPertinence.join(' ')).toContain('NAF éloigné');
  });

  test("établissement fermé (SIRENE 'F' — vraie valeur du domaine) → HORS-MISSION, jamais remonté par le plancher", () => {
    const r = computeSptV11(verified({
      sireneEtat: 'F', nbEtablissements: 1, nafCode: '01.49Z',
      siegeCodePostal: '30250', dateCreation: '2010-01-01', googleRating: 4.9,
    }));
    expect(r.bandeBrute).toBe('HORS-MISSION');
    expect(r.bandeOperationnelle).toBe('HORS-MISSION');
    expect(r.plancherApplique).toBe(false);
    expect(r.preuvesNonPertinence.join(' ')).toContain('fermé');
  });

  test("valeur d'état HORS DOMAINE ('C', 'X') → alerte revue, PAS de veto, PAS de preuve", () => {
    const r = computeSptV11(verified({ sireneEtat: 'C', nbEtablissements: 1, nafCode: '01.49Z' }));
    expect(r.etatSireneNonReconnu).toBe(true);
    expect(r.preuvesNonPertinence).toHaveLength(0);
    expect(r.bandeBrute).not.toBe('HORS-MISSION');
    expect(r.raisonsNegatives.join(' ')).toContain('non reconnu');
  });
});

describe('Faille ① — signal réseau par preuve officielle (catégorie INSEE groupe)', () => {
  test("enseigne nationale : petite unité légale MAIS catégorie GE → réseau détecté, indépendance 0", () => {
    // Profil générique « franchisé lié à un groupe » : 2 étabs, GE (consolidation groupe).
    const r = computeSptV11(verified({
      nbEtablissements: 2, categorieEntreprise: 'GE', nafCode: '47.21Z',
      siegeCodePostal: '34000', dateCreation: '2014-01-01', googleRating: 4.3,
    }));
    expect(r.signalReseau).toBe('SIGNAL_RESEAU_DETECTE');
    expect(r.scoreBrut).toBe(0 + 20 + 12 + 0 + 7); // 39 < 45
    expect(r.scoreBrut).toBeLessThan(45);
    expect(r.preuvesNonPertinence.join(' ')).toContain('réseau prouvé');
  });

  test('groupe régional (ETI) → réseau détecté (niveau binaire assumé)', () => {
    const r = computeSptV11(verified({ nbEtablissements: 6, categorieEntreprise: 'ETI', nafCode: '47.21Z' }));
    expect(r.signalReseau).toBe('SIGNAL_RESEAU_DETECTE');
  });

  test("CONTRE-EXEMPLE : entreprise locale multi-établissements PME → PAS pénalisée comme chaîne", () => {
    const r = computeSptV11(verified({
      nbEtablissements: 9, categorieEntreprise: 'PME', nafCode: '10.71C',
      siegeCodePostal: '30000', dateCreation: '2026-01-01', artisanRegistreMetiers: true,
    }));
    expect(r.signalReseau).toBe('SIGNAL_RESEAU_NON_ETABLI');
    expect(r.scoreBrut).toBe(10 + 13 + 25 + 10 + 0); // 58 — identique à v1.0
    expect(r.bandeOperationnelle).toBe('COMPATIBLE');
    expect(r.preuvesNonPertinence).toHaveLength(0);
  });

  test('franchise juridiquement indépendante (PME mono-étab, sans lien capitalistique) : limite documentée', () => {
    // Indétectable par les preuves officielles : scorée comme indépendante,
    // mais la raison dit « non contredite », jamais « prouvée ».
    const r = computeSptV11(verified({ nbEtablissements: 1, categorieEntreprise: 'PME', nafCode: '47.21Z' }));
    expect(r.signalReseau).toBe('SIGNAL_RESEAU_NON_ETABLI');
    expect(r.raisonsPositives.join(' ')).toContain('non contredite');
    expect(r.raisonsPositives.join(' ')).not.toContain('prouvée');
  });

  test('absence de signal réseau ≠ indépendance prouvée (indépendance inconnue reste inconnue)', () => {
    const r = computeSptV11(base);
    expect(r.signalReseau).toBe('SIGNAL_RESEAU_NON_ETABLI');
    expect(r.independanceConnue).toBe(false);
  });
});

describe('Seuils et bandes', () => {
  test('proche du seuil 60 : 60 → MISSIONNAIRE, 59 → COMPATIBLE', () => {
    // 60 : mono-étab (25) + siège local (10) + 2020 (+6) + NAF compat (12) + ★4.2 (7).
    const at60 = computeSptV11(verified({
      nbEtablissements: 1, nafCode: '47.21Z', siegeCodePostal: '34000',
      dateCreation: '2020-01-01', googleRating: 4.2,
    }));
    expect(at60.scoreBrut).toBe(60);
    expect(at60.bandeBrute).toBe('MISSIONNAIRE');
    // 59 est impossible à composer à ±1 près partout ; on teste la frontière par 57 :
    const below = computeSptV11(verified({
      nbEtablissements: 1, nafCode: '47.21Z', siegeCodePostal: '34000',
      dateCreation: '2024-01-01', googleRating: 4.2,
    }));
    expect(below.scoreBrut).toBe(57);
    expect(below.bandeBrute).toBe('COMPATIBLE');
  });

  test('proche du seuil 35 : 34 sans preuve → plancher ; 35 → COMPATIBLE sans plancher', () => {
    // 34 : neutres (8+5+8) + ★4.0 (7) + 6 ancienneté ? Non-matché ne porte pas d'ancienneté.
    // Profil : matché, 4 étabs (10), pas de siège local, 2020 (+6), NAF inconnu (8), ★4.0 (7) = 31.
    const under = computeSptV11(verified({
      nbEtablissements: 4, dateCreation: '2020-06-01', googleRating: 4.0,
    }));
    expect(under.scoreBrut).toBeLessThan(35);
    expect(under.plancherApplique).toBe(true);
    expect(under.bandeOperationnelle).toBe('COMPATIBLE');

    // 35 pile : 4 étabs (10) + siège local (10) + date inconnue (0) + NAF inconnu (8) + ★4.0 (7).
    const at35 = computeSptV11(verified({
      nbEtablissements: 4, googleRating: 4.0, siegeCodePostal: '30900',
    }));
    expect(at35.scoreBrut).toBe(35);
    expect(at35.plancherApplique).toBe(false);
    expect(at35.bandeOperationnelle).toBe('COMPATIBLE');
  });
});

describe('Gouvernance des actions — le SPT propose, il ne décide pas', () => {
  const horsMission = computeSptV11(verified({ nbEtablissements: 4, nafCode: '56.10C' }));
  const missionnaire = computeSptV11(verified({
    nbEtablissements: 1, nafCode: '01.49Z', siegeCodePostal: '30250',
    dateCreation: '2015-01-01', googleRating: 4.5,
  }));

  test('commerce déjà publié + HORS-MISSION → rétrogradation PROPOSÉE, validation humaine requise', () => {
    const a = proposeAction('active', horsMission, true);
    expect(a.action).toBe('RETROGRADATION_PROPOSEE');
    expect(a.validationHumaineRequise).toBe(true);
  });

  test('commerce déjà publié + bande correcte → aucune action', () => {
    expect(proposeAction('active', missionnaire, true).action).toBe('AUCUNE_ACTION');
  });

  test('pending + bande correcte + présentable → publication possible (nouveau commerce)', () => {
    expect(proposeAction('pending', missionnaire, true).action).toBe('PUBLICATION_POSSIBLE');
  });

  test('pending + non présentable → reste pending, même avec un bon score', () => {
    expect(proposeAction('pending', missionnaire, false).action).toBe('RESTE_PENDING');
  });

  test('pending + HORS-MISSION prouvé → reste pending', () => {
    expect(proposeAction('pending', horsMission, true).action).toBe('RESTE_PENDING');
  });

  test('règle Cheese Nan : COMPATIBLE mais porteur d\'une PREUVE (56.10C) → jamais publiable', () => {
    // Score ≥ 35 grâce à indépendance + ancrage, mais NAF éloigné prouvé.
    const r = computeSptV11(verified({
      nbEtablissements: 1, nafCode: '56.10C', siegeCodePostal: '34400', dateCreation: '2025-01-01',
    }));
    expect(r.bandeOperationnelle).toBe('COMPATIBLE');
    expect(r.preuvesNonPertinence.length).toBeGreaterThan(0);
    expect(proposeAction('pending', r, true).action).toBe('RESTE_PENDING');
  });

  test('fiche FERMÉE : pending → reste pending ; active → rétrogradation PROPOSÉE (jamais automatique)', () => {
    const fermee = computeSptV11(verified({ sireneEtat: 'F', nbEtablissements: 1, nafCode: '01.49Z' }));
    expect(proposeAction('pending', fermee, true).action).toBe('RESTE_PENDING');
    const a = proposeAction('active', fermee, true);
    expect(a.action).toBe('RETROGRADATION_PROPOSEE');
    expect(a.validationHumaineRequise).toBe(true);
  });

  test('état hors domaine → publication bloquée (revue), même présentable et bien classé', () => {
    const r = computeSptV11(verified({ sireneEtat: 'X', nbEtablissements: 1, nafCode: '01.49Z' }));
    expect(r.bandeOperationnelle).not.toBe('HORS-MISSION');
    expect(proposeAction('pending', r, true).action).toBe('RESTE_PENDING');
  });
});

describe('Port v1.0 — non-régression de la référence gelée (panel du 11/07/2026)', () => {
  test('reproduit le score v1.0 du profil franchisé (57 : faille ① visible)', () => {
    const gf = computeSptV10(verified({
      nbEtablissements: 2, categorieEntreprise: 'GE', nafCode: '47.21Z',
      siegeCodePostal: '34000', dateCreation: '2014-01-01', googleRating: 4.3,
    }));
    expect(gf.score).toBe(57); // v1.0 : nb≤3 masque GE → +18
    expect(gf.band).toBe('COMPATIBLE');
  });

  test('reproduit le score v1.0 du profil non vérifié (31 : faille ② visible)', () => {
    const h = computeSptV10({ ...base, googleRating: 4.6 });
    expect(h.score).toBe(31);
    expect(h.band).toBe('HORS-MISSION');
  });
});
