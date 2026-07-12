/**
 * SPT v1.1 — Score de Pertinence Territoriale (module PUR : déterministe, zéro I/O).
 *
 * Principes encodés (PRODUCT.md) :
 *  - Principe 0 : la pertinence territoriale avant l'exhaustivité.
 *  - Principe 2 : le silence ne punit pas — une donnée absente n'est jamais une donnée négative.
 *
 * Invariants v1.1 :
 *  - HORS-MISSION exige une PREUVE POSITIVE de non-pertinence (NAF éloigné vérifié,
 *    réseau prouvé, établissement fermé). Sans preuve → plancher COMPATIBLE.
 *  - SIGNAL_RESEAU_NON_ETABLI ≠ indépendance prouvée : l'absence de détection reste neutre.
 *  - Le SPT PROPOSE ; la rétrogradation d'une fiche publiée exige une validation humaine.
 *
 * Signal réseau (niveau binaire assumé — hiérarchie de solution v1.1) :
 *  - Fondement unique : `categorie_entreprise` INSEE (GE/ETI), calculée au niveau du GROUPE
 *    économique consolidé (décret 2008-1354). Un franchisé lié capitalistiquement à une
 *    enseigne nationale est classé GE/ETI même s'il est une petite unité légale locale
 *    (vérifié empiriquement : franchisé Grand Frais « MONTPELLIER FRUITS », 2 étabs → GE).
 *  - Le comptage nominal d'enseignes est REJETÉ : la recherche plein-texte matche 1023
 *    unités pour « CHEZ FABIEN » et 10000 pour « L'AMANDINE » — correspondance fragile.
 *  - LIMITE DOCUMENTÉE : un franchisé purement contractuel (sans lien capitalistique,
 *    PME mono-établissement) reste indétectable par les preuves officielles disponibles.
 *
 * Les poids restent des HYPOTHÈSES de calibration (panel du 11/07/2026).
 */

export type Band = 'MISSIONNAIRE' | 'COMPATIBLE' | 'HORS-MISSION';
export type NetworkSignal = 'SIGNAL_RESEAU_DETECTE' | 'SIGNAL_RESEAU_NON_ETABLI';
export type Confidence = 'haute' | 'moyenne' | 'basse';

export interface SptInput {
  /** Rapprochement SIRENE réussi (unité légale identifiée). */
  sireneMatched: boolean;
  /** État administratif SIRENE de l'ÉTABLISSEMENT : 'A' actif · 'F' fermé · null non rapproché.
   *  ('C' est le vocabulaire de l'unité légale — jamais stocké en base.) */
  sireneEtat: string | null;
  /** NAF de l'ÉTABLISSEMENT local (jamais celui du siège — piège Avignon/Metz). */
  nafCode: string | null;
  /** Nombre d'établissements de l'unité légale. */
  nbEtablissements: number | null;
  /** Catégorie INSEE de l'entreprise (groupe consolidé) : 'PME' | 'ETI' | 'GE'. */
  categorieEntreprise: string | null;
  /** Code postal du SIÈGE de l'unité légale (ancrage). */
  siegeCodePostal: string | null;
  /** Date de création SIRENE 'YYYY-MM-DD'. */
  dateCreation: string | null;
  /** Engagements prouvés (API Recherche d'Entreprises). */
  estBio: boolean;
  estEss: boolean;
  estSocieteMission: boolean;
  artisanRegistreMetiers: boolean;
  /** Signal humain. */
  googleRating: number | null;
}

export interface SptResult {
  scoreBrut: number;
  scoreOperationnel: number;
  bandeBrute: Band;
  bandeOperationnelle: Band;
  confiance: Confidence;
  signalReseau: NetworkSignal;
  /** true seulement si le rapprochement SIRENE donne un signal d'indépendance exploitable. */
  independanceConnue: boolean;
  raisonsPositives: string[];
  raisonsNegatives: string[];
  /** Sous-ensemble des raisons négatives qui constituent des PREUVES de non-pertinence. */
  preuvesNonPertinence: string[];
  /** Valeur d'état SIRENE hors domaine {A, F, null} : alerte, revue requise. */
  etatSireneNonReconnu: boolean;
  plancherApplique: boolean;
  raisonDuPlancher: string | null;
}

export const BAND_MISSIONNAIRE = 60;
export const BAND_COMPATIBLE = 35;

/** Territoire pilote : Gard + Hérault. */
const LOCAL_DEPARTMENTS = ['30', '34'];

/** Anneau CŒUR de mission : producteurs, artisans de bouche, métiers, commerces de terroir. */
const CORE_NAF = [
  '01.', '02.', '03.', '10.71', '10.51', '10.13', '23.41', '32.12', '16.29',
  '13.92', '95.', '47.25', '47.61', '47.76', '47.22', '47.24', '11.02',
];
/** Anneau COMPATIBLE : alimentaire de proximité, restauration traditionnelle. */
const COMPAT_NAF = ['56.10A', '47.21', '47.29', '47.81', '56.21', '10.', '47.26'];
/**
 * Anneau ÉLOIGNÉ — v1.2, RÈGLE DE CLASSE (arbitrage 12/07, faux rejet 47.23Z) :
 * « éloigné » ne s'attribue QUE par PREUVE POSITIVE — une liste EXPLICITE d'activités
 * dont la sémantique INSEE est étrangère au commerce local de proximité. Un NAF
 * simplement ABSENT des listes n'est jamais une preuve (Loi 3 : le silence ne punit
 * jamais ; un anneau fourre-tout fabriquait une « preuve » de non-pertinence à partir
 * d'une absence — 47.23Z poissonneries en a été la victime mesurée : 56 rejets à Sète).
 * Sections retenues : finance/assurance (64-66), immobilier (68), sièges & conseil
 * (70), services administratifs aux entreprises (77, 78, 82), organisations et
 * administrations (84, 94, 99). S'y ajoute 56.10C (restauration rapide) : exclusion
 * MÉTIER délibérée et documentée — le cas fondateur « Cheese Nan » (volume facile,
 * hors mission) devient une preuve positive au lieu d'un accident de fourre-tout.
 */
const EXCLUDED_NAF = ['64.', '65.', '66.', '68.', '70.', '77.', '78.', '82.', '84.', '94.', '99.', '56.10C'];

export type NafRing = 'coeur' | 'compatible' | 'eloigne' | 'inconnu';

export function classifyNaf(naf: string | null): NafRing {
  if (!naf) return 'inconnu';
  if (CORE_NAF.some((p) => naf.startsWith(p))) return 'coeur';
  if (COMPAT_NAF.some((p) => naf.startsWith(p))) return 'compatible';
  if (EXCLUDED_NAF.some((p) => naf.startsWith(p))) return 'eloigne';
  return 'inconnu'; // absence de preuve = neutre, jamais un rejet (Loi 3)
}

function isLocalPostalCode(cp: string | null): boolean {
  return cp != null && LOCAL_DEPARTMENTS.includes(cp.slice(0, 2));
}

function creationYear(dateCreation: string | null): number | null {
  if (!dateCreation) return null;
  const y = Number.parseInt(dateCreation.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

export function computeSptV11(input: SptInput): SptResult {
  const pos: string[] = [];
  const neg: string[] = [];
  const preuves: string[] = [];

  // ── Signal réseau : preuves officielles UNIQUEMENT, examinées AVANT tout compteur local
  //    (la faille ① de v1.0 était un bug d'ordre : nb_etablissements ≤ 3 masquait GE/ETI).
  const cat = input.categorieEntreprise;
  const reseauProuve = cat === 'GE' || cat === 'ETI';
  const signalReseau: NetworkSignal = reseauProuve
    ? 'SIGNAL_RESEAU_DETECTE'
    : 'SIGNAL_RESEAU_NON_ETABLI';

  // ── Indépendance /25
  let ind = 0;
  let independanceConnue = false;
  const nb = input.nbEtablissements;
  if (reseauProuve) {
    ind = 0;
    independanceConnue = true;
    const motif = `réseau prouvé : catégorie INSEE ${cat} (consolidation groupe, décret 2008-1354)`;
    neg.push(motif);
    preuves.push(motif);
  } else if (nb === 1) {
    ind = 25;
    independanceConnue = true;
    pos.push('mono-établissement (indépendance non contredite) +25');
  } else if (nb != null && nb <= 3) {
    ind = 18;
    independanceConnue = true;
    pos.push(`${nb} établissements +18`);
  } else if (nb != null) {
    ind = 10;
    independanceConnue = true;
    pos.push(`réseau local PME (${nb} étabs — pas une chaîne prouvée) +10`);
  } else {
    ind = 8;
    pos.push('indépendance inconnue (neutre) +8');
  }

  // ── Ancrage territorial /20
  let anc = 0;
  if (!input.sireneMatched) {
    anc = 5;
    pos.push('ancrage inconnu (neutre) +5');
  } else {
    if (isLocalPostalCode(input.siegeCodePostal)) {
      anc += 10;
      pos.push('siège local (30/34) +10');
    }
    const year = creationYear(input.dateCreation);
    if (year != null && year <= 2016) {
      anc += 10;
      pos.push(`depuis ${year} +10`);
    } else if (year != null && year <= 2022) {
      anc += 6;
      pos.push(`depuis ${year} +6`);
    } else if (year != null) {
      anc += 3;
      pos.push(`récent ${year} +3`);
    }
  }

  // ── Nature de l'activité /25 (3 anneaux NAF)
  let act = 0;
  const ring = classifyNaf(input.nafCode);
  if (ring === 'coeur') {
    act = 25;
    pos.push(`NAF cœur ${input.nafCode} +25`);
  } else if (ring === 'compatible') {
    act = 12;
    pos.push(`NAF compatible ${input.nafCode} +12`);
  } else if (ring === 'eloigne') {
    act = 0;
    const motif = `NAF éloigné vérifié (${input.nafCode})`;
    neg.push(motif);
    preuves.push(motif);
  } else {
    act = 8;
    pos.push('NAF inconnu (neutre) +8');
  }

  // ── Engagements prouvés /20 (plafonné)
  let eng = 0;
  if (input.estBio) { eng += 12; pos.push('agriculture biologique +12'); }
  if (input.artisanRegistreMetiers) { eng += 10; pos.push('registre des métiers +10'); }
  if (input.estEss) { eng += 8; pos.push('ESS +8'); }
  if (input.estSocieteMission) { eng += 6; pos.push('société à mission +6'); }
  eng = Math.min(eng, 20);

  // ── Signal humain /10
  let hum = 0;
  const r = input.googleRating;
  if (r != null && r >= 4.5) { hum = 10; pos.push(`★${r} +10`); }
  else if (r != null && r >= 4.0) { hum = 7; pos.push(`★${r} +7`); }
  else if (r != null) { hum = 3; pos.push(`★${r} +3`); }

  const scoreBrut = ind + anc + act + eng + hum;

  // ── Veto dur : établissement FERMÉ ('F' = vocabulaire établissement, preuve officielle).
  //    Une valeur hors domaine {A, F, null} n'est PAS un veto : alerte + revue (jamais
  //    punie automatiquement, jamais publiée automatiquement).
  const etat = input.sireneEtat;
  const ferme = etat === 'F';
  const etatSireneNonReconnu = etat != null && etat !== 'A' && etat !== 'F';
  if (ferme) {
    const motif = "établissement fermé (SIRENE état 'F')";
    neg.push(motif);
    preuves.push(motif);
  }
  if (etatSireneNonReconnu) {
    neg.push(`état SIRENE non reconnu (${etat}) — revue requise`);
  }

  let bandeBrute: Band =
    scoreBrut >= BAND_MISSIONNAIRE ? 'MISSIONNAIRE'
    : scoreBrut >= BAND_COMPATIBLE ? 'COMPATIBLE'
    : 'HORS-MISSION';
  if (ferme) bandeBrute = 'HORS-MISSION';

  // ── Plancher « le silence ne punit pas » : HORS-MISSION exige une preuve positive.
  let bandeOperationnelle = bandeBrute;
  let scoreOperationnel = scoreBrut;
  let plancherApplique = false;
  let raisonDuPlancher: string | null = null;
  if (bandeBrute === 'HORS-MISSION' && preuves.length === 0) {
    bandeOperationnelle = 'COMPATIBLE';
    scoreOperationnel = Math.max(BAND_COMPATIBLE, scoreBrut);
    plancherApplique = true;
    raisonDuPlancher =
      'aucune preuve positive de non-pertinence — le silence ne punit pas (principe 2)';
  }
  if (ferme) {
    // Un établissement fermé n'est jamais remonté par le plancher.
    bandeOperationnelle = 'HORS-MISSION';
    scoreOperationnel = scoreBrut;
    plancherApplique = false;
    raisonDuPlancher = null;
  }

  const confiance: Confidence = !input.sireneMatched
    ? 'basse'
    : input.categorieEntreprise == null
      ? 'moyenne'
      : 'haute';

  return {
    scoreBrut,
    scoreOperationnel,
    bandeBrute,
    bandeOperationnelle,
    confiance,
    signalReseau,
    independanceConnue,
    raisonsPositives: pos,
    raisonsNegatives: neg,
    preuvesNonPertinence: preuves,
    plancherApplique,
    raisonDuPlancher,
    etatSireneNonReconnu,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Proposition d'action — le SPT PROPOSE, il ne décide jamais seul.
// ─────────────────────────────────────────────────────────────────────────────

export type ProposedAction =
  | 'AUCUNE_ACTION'
  | 'RETROGRADATION_PROPOSEE'
  | 'PUBLICATION_POSSIBLE'
  | 'RESTE_PENDING';

export interface ActionProposal {
  action: ProposedAction;
  validationHumaineRequise: boolean;
}

export function proposeAction(
  currentStatus: string | null,
  result: SptResult,
  presentable: boolean,
): ActionProposal {
  if (currentStatus === 'active') {
    if (result.bandeOperationnelle === 'HORS-MISSION') {
      // Fiche publiée : JAMAIS de changement automatique de status.
      return { action: 'RETROGRADATION_PROPOSEE', validationHumaineRequise: true };
    }
    return { action: 'AUCUNE_ACTION', validationHumaineRequise: false };
  }
  // Publier exige : bande correcte, présentabilité, ZÉRO preuve de non-pertinence
  // (leçon Cheese Nan : un 56.10C à 38 restait « publiable ») et un état SIRENE sain.
  if (
    result.bandeOperationnelle !== 'HORS-MISSION' &&
    presentable &&
    result.preuvesNonPertinence.length === 0 &&
    !result.etatSireneNonReconnu
  ) {
    return { action: 'PUBLICATION_POSSIBLE', validationHumaineRequise: false };
  }
  return { action: 'RESTE_PENDING', validationHumaineRequise: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Port FIDÈLE du SPT v1.0 (référence gelée pour mesurer les changements de bande).
// Reproduit volontairement la faille ① (ordre des branches : le compteur
// d'établissements masque GE/ETI) et la faille ② (le silence punit).
// Source : script du dry-run panel, transcript session 2e24c30e (11/07/2026).
// ─────────────────────────────────────────────────────────────────────────────

export function computeSptV10(input: SptInput): { score: number; band: Band } {
  let ind: number;
  const nb = input.nbEtablissements;
  const cat = input.categorieEntreprise;
  if (nb === 1) ind = 25;
  else if (nb != null && nb <= 3) ind = 18;
  else if (cat === 'ETI' || cat === 'GE') ind = 0;
  else if (nb != null) ind = 10;
  else ind = 8;

  let anc = 0;
  if (input.sireneMatched) {
    if (isLocalPostalCode(input.siegeCodePostal)) anc += 10;
    const dc = input.dateCreation ?? '';
    if (dc && dc <= '2016') anc += 10;
    else if (dc && dc <= '2022') anc += 6;
    else if (dc) anc += 3;
  } else {
    anc = 5;
  }

  const ring = classifyNaf(input.nafCode);
  const act = ring === 'coeur' ? 25 : ring === 'compatible' ? 12 : ring === 'eloigne' ? 0 : 8;

  let eng = 0;
  if (input.estBio) eng += 12;
  if (input.artisanRegistreMetiers) eng += 10;
  if (input.estEss) eng += 8;
  if (input.estSocieteMission) eng += 6;
  eng = Math.min(eng, 20);

  const r = input.googleRating;
  const hum = r != null && r >= 4.5 ? 10 : r != null && r >= 4.0 ? 7 : r != null ? 3 : 0;

  const score = ind + anc + act + eng + hum;
  const band: Band =
    score >= BAND_MISSIONNAIRE ? 'MISSIONNAIRE'
    : score >= BAND_COMPATIBLE ? 'COMPATIBLE'
    : 'HORS-MISSION';
  return { score, band };
}
