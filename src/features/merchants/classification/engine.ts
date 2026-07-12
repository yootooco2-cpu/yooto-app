/**
 * Moteur Hierarchical Multi-Evidence (WS2) — voir ARCHITECTURE.md.
 *
 * FONCTION PURE : zéro I/O, zéro horloge → chaque décision est reproductible (invariant 5).
 * Le moteur CLASSIFIE et JUSTIFIE ; il ne juge jamais la publication (SPT) et ne rend
 * jamais une fiche invisible : QUARANTAINE est une file de travail, pas un retrait.
 */
import { CATEGORY_FAMILIES, type CategoryNode } from '../categoryFamilies';
import { cryptogramForMerchant, type CryptogramId } from '../cryptograms';
import type { Merchant } from '../types';

export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';
export type DecisionStatus = 'CLASSIFIED' | 'QUARANTAINE';

export interface OfficialFlags {
  /** Économie sociale et solidaire (complément officiel de l'API d'État). */
  estEss?: boolean;
}

export interface Decision {
  category: string | null;
  confidence: Confidence;
  source: string;
  evidence: string[];
  explanation: string;
  status: DecisionStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Preuve 1b — NAF de l'établissement. PRÉFIXES ordonnés (le plus spécifique d'abord).
// Un NAF « composite » couvre plusieurs réalités : il ne suffit JAMAIS seul.
// ─────────────────────────────────────────────────────────────────────────────

type NafTarget = { node: string } | { composite: string[] };

const NAF_MAP: [prefix: string, target: NafTarget][] = [
  ['01.21', { node: 'vignerons-domaines' }],
  ['11.02', { node: 'vignerons-domaines' }],
  ['01.', { node: 'producteurs' }],
  ['02.', { node: 'producteurs' }],
  ['03.', { node: 'producteurs' }],
  ['10.71', { node: 'boulangeries' }],
  ['10.82', { node: 'patisseries' }],
  ['10.52', { node: 'patisseries' }],
  ['10.51', { node: 'fromageries' }],
  ['10.13', { node: 'traiteurs' }],
  ['47.11', { node: 'epiceries' }],
  ['47.21', { node: 'primeurs' }],
  ['47.22', { node: 'boucheries' }],
  ['47.23', { node: 'poissonneries' }],
  ['47.24', { node: 'patisseries' }],
  ['47.25', { node: 'cavistes' }],
  ['47.29', { node: 'epiceries' }],
  ['47.61', { node: 'librairies' }],
  // Extension périmètre 12/07 (décision : rattacher aux catégories EXISTANTES, jamais
  // en créer — « le moteur s'adapte à l'application, jamais l'inverse ») :
  ['47.62', { node: 'librairies' }], // presse & papeterie → Librairies (plusieurs NAF par catégorie = assumé)
  ['47.63', { node: 'disquaires' }],
  // 47.64Z : « articles de sport » couvre cycles/glisse ET sport généraliste → COMPOSITE,
  // résolu seulement par une preuve niveau 2 (texte/Google), sinon quarantaine — le tri voulu.
  ['47.64', { composite: ['velos', 'skate-rollers', 'trottinettes', 'mobilite'] }],
  // 47.76Z : « fleurs, plantes, graines, engrais, ANIMAUX de compagnie et leurs aliments ».
  ['47.76', { composite: ['fleuristes', 'jardineries', 'animaleries'] }],
  ['47.77', { node: 'bijouterie-joaillerie' }],
  ['47.79', { node: 'reparation-seconde-main' }],
  ['47.81', { node: 'marches' }],
  ['38.31', { node: 'reparation-seconde-main' }],
  // Mobilité — motos & scooters (45.40Z « commerce et réparation de motocycles »), seul
  // gisement automobile PROUVÉ de la base (45.20 garages absents). Preuve NAF forte.
  ['45.40', { node: 'motos' }],
  ['56.10', { node: 'restaurants' }],
  ['56.21', { node: 'traiteurs' }],
  ['56.30', { node: 'bars-cafes' }],
  ['95.2', { node: 'reparation-seconde-main' }],
  ['96.02', { node: 'bienetre' }],
  ['96.04', { node: 'bienetre' }],
  ['23.41', { node: 'artisanat' }],
  ['32.12', { node: 'artisanat' }],
  ['16.29', { node: 'artisanat' }],
  ['13.92', { node: 'artisanat' }],
];

function resolveNaf(naf: string | null | undefined): { target: NafTarget; prefix: string } | null {
  if (!naf) return null;
  for (const [prefix, target] of NAF_MAP) {
    if (naf.startsWith(prefix)) return { target, prefix };
  }
  return null;
}

// NAF « fourre-tout » : code officiel large qui NE désigne PAS un métier précis (ex. 47.29Z
// « autres commerces de détail alimentaires en magasin spécialisé » couvre fromagerie, épicerie
// fine, torréfaction…). Pour ceux-là seulement, une preuve TEXTE forte de MÊME famille affine la
// feuille (Loi 5 : le complément précise, il ne contredit pas) — jamais pour un NAF spécifique.
const REFINABLE_NAF = new Set<string>(['47.29']);

// ─────────────────────────────────────────────────────────────────────────────
// Preuve 2a — catégorie Google. Réutilise le registre existant (Loi 7) via
// cryptogramForMerchant ; « autres » = générique = ABSENCE de preuve, pas une preuve.
// Les types « bureau » forment une pseudo-catégorie NON-COMMERCE : classe générique
// des professions de bureau, qui CONTREDIT tout NAF commerçant (jamais une devinette).
// ─────────────────────────────────────────────────────────────────────────────

// Raffinements Google directs (niveau 2a) : une catégorie Google SPÉCIFIQUE désigne une
// FEUILLE précise que le registre cryptogramme (générique) ne capte pas. Preuve secondaire
// (Loi 5) : ne s'applique qu'en l'absence de NAF spécifique, et une contradiction avec le NAF
// part en quarantaine comme toute autre. `jewelry_store` → Bijouterie & Joaillerie.
const GOOGLE_REFINE: Record<string, string> = {
  jewelry_store: 'bijouterie-joaillerie',
};

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

export const NON_COMMERCE = '__non-commerce__';
const OFFICE_RAW = [
  'corporate_office', 'office', 'insurance_agency', 'real_estate_agency',
  'lawyer', 'accounting', 'finance', 'local_government_office', 'city_hall',
];

function resolveGoogle(m: Merchant): { node: string; raw: string } | null {
  const raws = [m.rawCategory, m.rawMerchantType].filter(Boolean) as string[];
  for (const raw of raws) {
    const key = raw.trim().toLowerCase();
    if (OFFICE_RAW.includes(key)) return { node: NON_COMMERCE, raw };
    if (GOOGLE_REFINE[key]) return { node: GOOGLE_REFINE[key], raw };
  }
  const crypto = cryptogramForMerchant(m);
  const node = CRYPTO_TO_NODE[crypto];
  if (!node) return null; // « autres » et non-mappés : générique, pas une preuve.
  return { node, raw: raws[0] ?? m.category };
}

// ─────────────────────────────────────────────────────────────────────────────
// Preuve 2b — texte : RADICAUX en début de mot (Loi 8 — jamais de sous-chaîne).
// Deux indices de catégories différentes = ambiguïté = aucune preuve textuelle.
// ─────────────────────────────────────────────────────────────────────────────

const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const stem = (needle: string): RegExp => new RegExp(`(?:^|[^a-z0-9])${escapeRe(needle)}`);

const TEXT_HINTS: [node: string, stems: string[]][] = [
  ['vignerons-domaines', ['vigneron', 'viticol', 'vignoble']],
  ['fleuristes', ['fleuriste', 'fleurs']],
  ['animaleries', ['animal', 'toilettage', 'veterinaire']],
  ['jardineries', ['jardinerie', 'pepiniere']],
  ['reparation-seconde-main', ['cordonn', 'repar', 'retouch', 'ressourcerie', 'recyclerie', 'friperie']],
  ['boucheries', ['boucher']],
  ['fromageries', ['fromage', 'cremerie', 'cremier']],
  ['primeurs', ['primeur']],
  ['cooperatives', ['cooperat']],
];

function resolveText(m: Merchant): { node: string; hit: string } | null {
  const hay = norm([m.name, m.description].filter(Boolean).join(' '));
  const hits: { node: string; hit: string }[] = [];
  for (const [node, stems] of TEXT_HINTS) {
    const found = stems.find((s) => stem(norm(s)).test(hay));
    if (found) hits.push({ node, hit: found });
  }
  const distinct = new Set(hits.map((h) => h.node));
  if (distinct.size !== 1) return null; // 0 ou ≥2 catégories : pas de preuve textuelle.
  return hits[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Familles : dérivées de l'ARBRE RÉEL (Loi 7) — divergence intra-famille = raffinement,
// divergence inter-familles = contradiction.
// ─────────────────────────────────────────────────────────────────────────────

const NODE_FAMILY: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  const walk = (nodes: CategoryNode[], root: string): void => {
    for (const n of nodes) {
      map[n.id] = root;
      if (n.children) walk(n.children, root);
    }
  };
  for (const fam of CATEGORY_FAMILIES) {
    map[fam.id] = fam.id;
    if (fam.children) walk(fam.children, fam.id);
  }
  return map;
})();

const familyOf = (node: string): string | undefined => NODE_FAMILY[node];

// ─────────────────────────────────────────────────────────────────────────────
// Décision
// ─────────────────────────────────────────────────────────────────────────────

const decide = (partial: Omit<Decision, 'status'>, status: DecisionStatus = 'CLASSIFIED'): Decision =>
  ({ ...partial, status });

const quarantaine = (partial: Omit<Decision, 'status' | 'category'> & { category?: string | null }): Decision =>
  ({ category: partial.category ?? null, confidence: partial.confidence, source: partial.source,
     evidence: partial.evidence, explanation: partial.explanation, status: 'QUARANTAINE' });

// ── NAF 85.51Z « enseignement de disciplines sportives » : rattachement Bien-être CONTRÔLÉ ──
// Le NAF prouve le DOMAINE (sport/loisir), PAS une sous-catégorie Bien-être. On n'attache que si
// un signal discipline « bien-être » explicite existe (nom, catégorie Google, activité, spécialité,
// tags) ET qu'aucun sport spécifique ne le contredit. Sinon : jamais de rattachement forcé.
const WELLNESS_85_51: [node: string, stems: string[]][] = [
  ['yoga', ['yoga', 'hatha', 'vinyasa', 'yin yoga', 'kundalini', 'ashtanga']],
  ['pilates', ['pilates', 'reformer', 'methode pilates']],
  ['coaching-sportif', ['coach sportif', 'coaching sportif', 'personal trainer', 'preparation physique', 'preparateur physique', 'remise en forme']],
  ['fitness', ['fitness', 'salle de sport', 'gym', 'cross training', 'crossfit', 'musculation']],
  // Bien-être corporel sans feuille dédiée → repli documenté sur la famille « bienetre ».
  ['bienetre', ['qi gong', 'qigong', 'tai chi', 'stretching', 'mobilite corporelle', 'respiration', 'relaxation', 'sophrologie', 'meditation']],
];
const SPORT_EXCL_85_51 = [
  'football', 'rugby', 'tennis', 'natation', 'piscine', 'equitation', 'equestre', 'danse competitive',
  'judo', 'karate', 'boxe', 'escrime', 'basket', 'handball', 'club sportif', 'association sportive',
  'multisport', 'multi sport', 'ecole multisport', 'arts martiaux', 'athletisme', 'gymnastique',
  'volley', 'padel', 'squash', 'stadium', 'sports_club',
];

function classifySportTeaching(m: Merchant): Decision {
  const hay = norm(
    [m.name, m.description, m.rawCategory, m.rawMerchantType, ...(m.tags ?? [])].filter(Boolean).join(' '),
  );
  // Exclusion PRIORITAIRE : un sport spécifique / club généraliste l'emporte sur tout signal bien-être.
  const excl = SPORT_EXCL_85_51.find((s) => stem(norm(s)).test(hay));
  if (excl) {
    return quarantaine({
      confidence: 'LOW', source: 'NAF 85.51Z + sport spécifique',
      evidence: [`NAF ${m.nafCode} (enseignement sportif)`, `signal sport spécifique « ${excl} »`],
      explanation: `Enseignement sportif dont le signal désigne un sport spécifique (${excl}) : hors Bien-être, aucun rattachement forcé — la fiche reste visible (Loi 3).`,
    });
  }
  for (const [node, stems] of WELLNESS_85_51) {
    const hit = stems.find((s) => stem(norm(s)).test(hay));
    if (hit) {
      return decide({
        category: node, confidence: 'HIGH', source: 'NAF 85.51Z + signal discipline',
        evidence: [`NAF ${m.nafCode} (enseignement sportif, officiel)`, `signal discipline bien-être « ${hit} »`],
        explanation: `Enseignement sportif (NAF ${m.nafCode}) confirmé comme discipline Bien-être par un signal explicite « ${hit} » → ${node}.`,
      });
    }
  }
  return quarantaine({
    confidence: 'LOW', source: 'NAF 85.51Z seul',
    evidence: [`NAF ${m.nafCode} (enseignement sportif)`, 'aucun signal discipline Bien-être'],
    explanation: `NAF 85.51Z prouve un enseignement sportif mais aucun signal ne désigne une discipline Bien-être précise : pas de rattachement forcé — la fiche reste visible.`,
  });
}

export function classifyMerchant(m: Merchant, flags?: OfficialFlags): Decision {
  // ── Preuve 1a : engagement officiel. Le cas La Cagette a prouvé que la catégorie
  //    Coopératives est INVISIBLE au NAF (SAS coopérative) : l'ESS prime.
  if (flags?.estEss) {
    const naf = m.nafCode ? ` (activité NAF ${m.nafCode} conservée en trace)` : '';
    return decide({
      category: 'cooperatives', confidence: 'HIGH', source: 'officiel (ESS)',
      evidence: [`flag ESS de l'API d'État${naf}`],
      explanation: `Acteur de l'économie sociale et solidaire prouvé par l'État : classé Coopératives${naf}.`,
    });
  }

  // NAF 85.51Z — enseignement sportif : rattachement Bien-être CONTRÔLÉ (jamais forcé), avant la
  // résolution NAF générique (85.51Z n'est volontairement PAS dans NAF_MAP).
  if ((m.nafCode ?? '').toUpperCase().replace(/\s/g, '').startsWith('85.51')) {
    return classifySportTeaching(m);
  }

  const naf = resolveNaf(m.nafCode);
  const google = resolveGoogle(m);
  // v1.1 : le texte est TOUJOURS évalué — les preuves de même niveau se surveillent entre elles.
  const text = resolveText(m);
  const level2 = google ?? (text ? { node: text.node, raw: `texte « ${text.hit} »` } : null);
  const level2Label = google ? `catégorie Google « ${google.raw} »` : text ? `radical textuel « ${text.hit} »` : null;
  /** Contradiction INTRA-niveau 2 : 2a et 2b présents et discordants (règle de classe v1.1). */
  const intra2 = google && text && google.node !== text.node
    ? { a: `catégorie Google « ${google.raw} » → ${google.node}`, b: `radical textuel « ${text.hit} » → ${text.node}` }
    : null;

  // ── Preuve 1b : NAF cartographié, non composite.
  if (naf && 'node' in naf.target) {
    let node = naf.target.node;
    // Raffinage NOM d'un NAF fourre-tout (47.29) par une preuve texte forte de MÊME famille :
    // « Fromagerie… » → fromageries au lieu d'épiceries. N'écrase jamais un NAF spécifique.
    const refined =
      REFINABLE_NAF.has(naf.prefix) && text && text.node !== node && familyOf(text.node) === familyOf(node)
        ? text.node
        : null;
    if (refined) node = refined;
    if (level2 && level2.node === NON_COMMERCE) {
      return quarantaine({
        confidence: 'LOW', source: 'contradiction NAF/Google',
        evidence: [`NAF ${m.nafCode} → ${node}`, `${level2Label} → non-commerce (bureau)`],
        explanation: `Le NAF déclare une activité commerçante (${node}) mais le signal Google décrit un bureau : contradiction inter-natures, aucun ne gagne — revue requise (accueil du public non prouvé).`,
      });
    }
    if (level2 && level2.node !== node && familyOf(level2.node) !== familyOf(node)) {
      return quarantaine({
        confidence: 'LOW', source: 'contradiction NAF/Google',
        evidence: [`NAF ${m.nafCode} → ${node}`, `${level2Label} → ${level2.node}`],
        explanation: `Deux preuves de familles différentes se contredisent (${node} vs ${level2.node}) : aucun niveau ne l'emporte, le cas part en revue.`,
      });
    }
    const divergence =
      level2 && level2.node !== node
        ? ` La preuve secondaire (${level2Label} → ${level2.node}) diverge dans la MÊME famille : raffinement journalisé, le NAF mène.`
        : level2
          ? ' La preuve secondaire concorde.'
          : '';
    return decide({
      category: node, confidence: 'HIGH',
      source: refined ? 'NAF fourre-tout + raffinement nom' : level2 && level2.node === node ? 'NAF + concordance' : 'NAF',
      evidence: [
        `NAF ${m.nafCode}${refined ? ` (fourre-tout ${naf.prefix}, affiné par le nom)` : ''}`,
        ...(level2 ? [`${level2Label} → ${level2.node}`] : []),
      ],
      explanation: refined
        ? `NAF fourre-tout ${m.nafCode} (${naf.prefix}) affiné par une preuve nom forte vers ${node} (même famille) : raffinement journalisé, preuve officielle conservée.`
        : `Activité prouvée par le registre officiel (NAF ${m.nafCode} → ${node}).${divergence}`,
    });
  }

  // ── Preuve 1b : NAF COMPOSITE — ne suffit jamais seul, et sa résolution exige un
  //    niveau 2 NON CONTREDIT en son sein (règle v1.1 — falsification Animalis).
  if (naf && 'composite' in naf.target) {
    const candidates = naf.target.composite;
    if (intra2) {
      return quarantaine({
        confidence: 'LOW', source: 'contradiction intra-niveau',
        evidence: [`NAF ${m.nafCode} (composite : ${candidates.join(' | ')})`, intra2.a, intra2.b],
        explanation: `Le NAF ${m.nafCode} est composite et les deux preuves secondaires se contredisent (${google!.node} vs ${text!.node}) : aucune ne peut le résoudre — revue requise, jamais une devinette.`,
      });
    }
    if (level2 && candidates.includes(level2.node)) {
      return decide({
        category: level2.node, confidence: 'HIGH', source: 'NAF composite + concordance',
        evidence: [`NAF ${m.nafCode} (composite : ${candidates.join(' | ')})`, `${level2Label} → ${level2.node}`],
        explanation: `Le NAF ${m.nafCode} couvre plusieurs réalités ; la preuve secondaire désigne ${level2.node} parmi les candidats : deux preuves concordantes.`,
      });
    }
    if (level2) {
      return quarantaine({
        confidence: 'LOW', source: 'contradiction NAF/Google',
        evidence: [`NAF ${m.nafCode} (composite : ${candidates.join(' | ')})`, `${level2Label} → ${level2.node}`],
        explanation: `La preuve secondaire (${level2.node}) sort des candidats du NAF composite : contradiction, revue requise.`,
      });
    }
    return quarantaine({
      confidence: 'LOW', source: 'NAF composite seul',
      evidence: [`NAF ${m.nafCode} (composite : ${candidates.join(' | ')})`],
      explanation: `Le NAF ${m.nafCode} ne distingue pas ${candidates.join(', ')} et aucune preuve secondaire n'existe : preuves insuffisantes pour décider — revue, jamais une devinette.`,
    });
  }

  // ── NAF absent ou non cartographié : on DESCEND d'un niveau (Loi 3), on n'abandonne pas.
  const nafNote = m.nafCode ? `NAF ${m.nafCode} non cartographié — ` : 'NAF absent — ';
  // v1.1 : sans arbitre de niveau 1, une contradiction 2a/2b INTER-FAMILLES part en revue ;
  // une divergence intra-famille reste un raffinement (garde anti-sur-prudence : Caveau-like).
  if (intra2 && familyOf(google!.node) !== familyOf(text!.node) && google!.node !== NON_COMMERCE) {
    return quarantaine({
      confidence: 'LOW', source: 'contradiction intra-niveau',
      evidence: [nafNote.trim().replace(/ —$/, ''), intra2.a, intra2.b],
      explanation: `${nafNote}les deux preuves secondaires désignent des familles différentes (${google!.node} vs ${text!.node}) sans arbitre officiel : contradiction intra-niveau, revue requise.`,
    });
  }
  if (level2 && level2.node !== NON_COMMERCE) {
    return decide({
      category: level2.node, confidence: 'MEDIUM', source: google ? 'Google' : 'texte',
      evidence: [nafNote.trim().replace(/ —$/, ''), `${level2Label} → ${level2.node}`],
      explanation: `${nafNote}classement par la preuve secondaire (${level2Label}). Une preuve officielle future pourra le confirmer ou le contredire.`,
    });
  }
  return quarantaine({
    confidence: 'LOW', source: 'aucune',
    evidence: [nafNote.trim().replace(/ —$/, ''), 'aucune preuve secondaire spécifique'],
    explanation: `${nafNote}aucune preuve secondaire exploitable : le silence ne punit pas, la fiche reste visible et part en file de revue.`,
  });
}
