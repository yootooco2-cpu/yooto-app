/**
 * RÈGLE DE CLASSE (GATE 3, décision du 12/07) :
 *
 *   « La preuve d'existence d'un acteur économique ne constitue jamais, à elle seule,
 *     une preuve d'existence d'un lieu ouvert au public. »
 *
 * Générique par construction — AUCUNE exception métier, aucun `if NAF == 01.xx` :
 * la distinction vient de la SÉMANTIQUE de la nomenclature NAF elle-même.
 *
 *  - Divisions à ACCUEIL INTRINSÈQUE : le code décrit par définition un lieu de vente
 *    ou de service AU PUBLIC (commerce de détail 47, restauration 56, réparation de
 *    biens personnels 95.2, services personnels 96, hébergement 55). Pipeline A :
 *    SIRENE suffit comme preuve de lieu.
 *  - Toute autre division (production primaire, transformation, gros, services aux
 *    entreprises…) décrit une ACTIVITÉ, pas un lieu. Pipeline B : la publication exige
 *    une preuve INDÉPENDANTE d'accueil du public.
 *
 * Preuves d'accueil indépendantes, par ordre de force (extensible — Google, site web,
 * office de tourisme viendront enrichir cette liste sans changer la règle) :
 *  1. enseigne déclarée au répertoire (l'exploitant a déclaré un nom de façade) ;
 *  2. l'ADRESSE de l'établissement porte le lieu d'exploitation (château/domaine/mas…) ;
 *  3. la dénomination commerciale est un nom de LIEU (et non une structure patrimoniale).
 */

/** Divisions NAF dont la sémantique EST un lieu recevant du public. */
const INTRINSIC_RECEPTION_PREFIXES = ['47', '55', '56', '95.2', '96'];

export function hasIntrinsicReception(naf: string | null | undefined): boolean {
  if (!naf) return false;
  return INTRINSIC_RECEPTION_PREFIXES.some((p) => naf.startsWith(p));
}

/** Noms de LIEU d'exploitation (vocabulaire toponymique, pas des métiers). */
const LIEU_RE = /\b(DOMAINES?|CH[ÂA]TEAUX?|MAS|CLOS|ABBAYES?|CAVES?|CAVEAUX?|VIGNOBLES?|CELLIERS?|FERMES?|MOULINS?|BERGERIES?|CHEVRERIES?|RUCHERS?|JARDINS?|HALLE?S)\b/i;
/** Structures patrimoniales / formes juridiques de moyens (jamais des façades). */
const PATRIMONIAL_RE = /\b(GFA|SCI|SOC(IETE)? ?CIV(ILE)?|INDIVISION|IND\b|GROUPEMENT FONCIER|CUMA)\b/i;
/** Vocabulaire de BUREAU : une enseigne qui raconte une activité de gestion n'est pas
 *  une preuve d'accueil pour une activité de production (classe « enseigne discordante »). */
const BUREAU_RE = /\b(IMMOBILIER|GESTION|PATRIMOINE|HOLDING|INVEST|CONSEIL|FINANC)/i;
/** Un toponyme n'est un LIEU-DIT que s'il ouvre l'adresse — dans « 584 RUE DU MAS ROUGE »,
 *  le mas appartient au nom de la VOIE (classe « odonyme de voirie », faux positif). */
const LIEU_EN_TETE_RE = new RegExp(`^\\s*(?:LE |LA |LES |L')?${LIEU_RE.source.slice(2)}`, 'i');
const CHEZ_RE = /^\s*CHEZ\b/i;

export interface ReceptionCandidate {
  naf: string | null;
  nom: string | null;
  enseignes: string[] | null;
  adresse: string | null;
}

export interface ReceptionVerdict {
  proven: boolean;
  evidence: string[];
  /** Ce qui manque quand proven=false — alimente la file d'enrichissement (pipeline B). */
  missing?: string;
}

export function receptionEvidence(c: ReceptionCandidate): ReceptionVerdict {
  if (hasIntrinsicReception(c.naf)) {
    return {
      proven: true,
      evidence: [`accueil intrinsèque à la nomenclature (NAF ${c.naf} = lieu de vente/service au public)`],
    };
  }
  const evidence: string[] = [];
  const enseigne = c.enseignes?.[0];
  if (enseigne && !BUREAU_RE.test(enseigne)) {
    evidence.push(`enseigne déclarée au répertoire : « ${enseigne} »`);
  }
  if (c.adresse && LIEU_EN_TETE_RE.test(c.adresse) && !CHEZ_RE.test(c.adresse)) {
    evidence.push(`l'adresse OUVRE sur le lieu d'exploitation (« ${c.adresse} »)`);
  }
  const nom = c.nom ?? '';
  if (LIEU_RE.test(nom) && !PATRIMONIAL_RE.test(nom)) {
    evidence.push(`dénomination commerciale de lieu (« ${nom} »)`);
  }
  if (evidence.length > 0) return { proven: true, evidence };
  return {
    proven: false,
    evidence: [],
    missing:
      'activité de production : aucune preuve indépendante d’accueil du public — ' +
      'enrichissement requis (Google, site web, office de tourisme) avant publication',
  };
}
