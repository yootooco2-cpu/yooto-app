/**
 * SPT v1.1 — DRY-RUN en LECTURE SEULE (aucun UPDATE, aucun changement de status,
 * aucune suppression : ce script n'émet QUE des GET).
 *
 * Usage (Node 22.6+) :
 *   node --experimental-strip-types --env-file=.env.local scripts/spt/dryrun.ts --panel
 *   node --experimental-strip-types --env-file=.env.local scripts/spt/dryrun.ts
 *
 * --panel : rejoue uniquement les 9 cas de scripts/spt/panel-baseline-v1.0.json
 *           et compare v1.0 (port gelé) / baseline / v1.1.
 * Sans argument : dry-run intégral du catalogue → rapports JSON + Markdown
 *                 dans scripts/spt/reports/ (non suivi par git).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  computeSptV10,
  computeSptV11,
  proposeAction,
  type SptInput,
  type SptResult,
  type ActionProposal,
} from './score.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SB_URL || !SB_KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants (.env.local)');

const SIRENE_API = 'https://recherche-entreprises.api.gouv.fr';
const PANEL_MODE = process.argv.includes('--panel');

interface MerchantRow {
  id: number;
  name: string;
  status: string | null;
  source: string | null;
  category: string | null;
  photo_url: string | null;
  latitude: number | null;
  google_rating: number | null;
  siret: string | null;
  naf_code: string | null;
  sirene_etat: string | null;
  sirene_nb_etablissements: number | null;
  sirene_date_creation: string | null;
}

const MERCHANT_COLUMNS =
  'id,name,status,source,category,photo_url,latitude,google_rating,siret,naf_code,sirene_etat,sirene_nb_etablissements,sirene_date_creation';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function sbGet<T>(path: string): Promise<T> {
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    headers: { apikey: SB_KEY!, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase GET ${path} → ${res.status}`);
  return (await res.json()) as T;
}

async function fetchAllMerchants(): Promise<MerchantRow[]> {
  const all: MerchantRow[] = [];
  const page = 500;
  for (let offset = 0; ; offset += page) {
    const rows = await sbGet<MerchantRow[]>(
      `merchants?select=${MERCHANT_COLUMNS}&order=id.asc&limit=${page}&offset=${offset}`,
    );
    all.push(...rows);
    if (rows.length < page) return all;
  }
}

/** Enrichissement SIRENE live (catégorie INSEE groupe + engagements). GET uniquement. */
interface SireneExtra {
  ok: boolean;
  categorieEntreprise: string | null;
  siegeCodePostal: string | null;
  estBio: boolean;
  estEss: boolean;
  estSocieteMission: boolean;
  artisanRegistreMetiers: boolean;
}

const NO_EXTRA: SireneExtra = {
  ok: false, categorieEntreprise: null, siegeCodePostal: null,
  estBio: false, estEss: false, estSocieteMission: false, artisanRegistreMetiers: false,
};

const sireneCache = new Map<string, SireneExtra>();

async function fetchSireneExtra(siret: string): Promise<SireneExtra> {
  const cached = sireneCache.get(siret);
  if (cached) return cached;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const res = await fetch(`${SIRENE_API}/search?q=${siret}&per_page=1`, {
        headers: { 'User-Agent': 'YOOTOO-SPT-dryrun/1.1' },
      });
      if (res.status === 429) { await sleep(2000); continue; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as any;
      const r = data?.results?.[0];
      if (!r) break;
      // Garde-fou : le résultat doit bien porter NOTRE établissement.
      const etabs: any[] = [r.siege, ...(r.matching_etablissements ?? [])].filter(Boolean);
      if (!etabs.some((e) => e?.siret === siret)) break;
      const c = r.complements ?? {};
      const extra: SireneExtra = {
        ok: true,
        categorieEntreprise: r.categorie_entreprise ?? null,
        siegeCodePostal: r.siege?.code_postal ?? null,
        estBio: c.est_bio === true,
        estEss: c.est_ess === true,
        estSocieteMission: c.est_societe_mission === true,
        artisanRegistreMetiers: etabs.some((e) => e?.activite_principale_registre_metier),
      };
      sireneCache.set(siret, extra);
      return extra;
    } catch {
      await sleep(1000);
    }
  }
  sireneCache.set(siret, NO_EXTRA);
  return NO_EXTRA;
}

function toInput(m: MerchantRow, extra: SireneExtra): SptInput {
  return {
    sireneMatched: m.siret != null,
    sireneEtat: m.sirene_etat,
    nafCode: m.naf_code,
    nbEtablissements: m.sirene_nb_etablissements,
    categorieEntreprise: extra.categorieEntreprise,
    siegeCodePostal: extra.siegeCodePostal,
    dateCreation: m.sirene_date_creation,
    estBio: extra.estBio,
    estEss: extra.estEss,
    estSocieteMission: extra.estSocieteMission,
    artisanRegistreMetiers: extra.artisanRegistreMetiers,
    googleRating: m.google_rating,
  };
}

/** Voies de publication (inchangées — mesure seulement, aucune écriture). */
function isPresentable(m: MerchantRow): boolean {
  const riche = m.photo_url != null && m.google_rating != null && m.category != null;
  const verifiee =
    m.siret != null && m.sirene_etat === 'A' && m.naf_code != null && m.latitude != null;
  return riche || verifiee;
}

interface FicheReport {
  id: number;
  nom: string;
  statut_actuel: string | null;
  score_brut: number;
  score_operationnel: number;
  bande_brute: string;
  bande_operationnelle: string;
  confiance: string;
  raisons_positives: string[];
  raisons_negatives: string[];
  plancher_applique: boolean;
  raison_du_plancher: string | null;
  signal_reseau: string;
  preuves_non_pertinence: string[];
  sources: string[];
  v1_0_score: number;
  v1_0_bande: string;
  changement_bande_v10_v11: boolean;
  ancienne_classification: string;
  nouvelle_classification: string;
  action_proposee: string;
  validation_humaine_requise: boolean;
  presentable: boolean;
  api_enrichie: boolean;
}

function buildFiche(m: MerchantRow, extra: SireneExtra): FicheReport {
  const input = toInput(m, extra);
  const r: SptResult = computeSptV11(input);
  const v10 = computeSptV10(input);
  const presentable = isPresentable(m);
  const action: ActionProposal = proposeAction(m.status, r, presentable);
  const sources = ['supabase.merchants (lecture seule)'];
  if (m.siret) sources.push('SIRENE (migration 009)');
  if (extra.ok) sources.push('recherche-entreprises.api.gouv.fr (live, GET)');
  return {
    id: m.id,
    nom: m.name,
    statut_actuel: m.status,
    score_brut: r.scoreBrut,
    score_operationnel: r.scoreOperationnel,
    bande_brute: r.bandeBrute,
    bande_operationnelle: r.bandeOperationnelle,
    confiance: r.confiance,
    raisons_positives: r.raisonsPositives,
    raisons_negatives: r.raisonsNegatives,
    plancher_applique: r.plancherApplique,
    raison_du_plancher: r.raisonDuPlancher,
    signal_reseau: r.signalReseau,
    preuves_non_pertinence: r.preuvesNonPertinence,
    sources,
    v1_0_score: v10.score,
    v1_0_bande: v10.band,
    changement_bande_v10_v11: v10.band !== r.bandeOperationnelle,
    ancienne_classification: `${m.status} / v1.0 ${v10.band}`,
    nouvelle_classification: `v1.1 ${r.bandeOperationnelle} (brut ${r.bandeBrute})`,
    action_proposee: action.action,
    validation_humaine_requise: action.validationHumaineRequise,
    presentable,
    api_enrichie: extra.ok,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

async function runPanel(): Promise<void> {
  const baseline = JSON.parse(
    readFileSync(join(HERE, 'panel-baseline-v1.0.json'), 'utf8'),
  ) as { panel: Array<{ name: string; score_v1_0: number; band_v1_0: string }> };

  console.log('nom | v1.0 baseline | v1.0 recalculé | v1.1 brut | v1.1 opérationnel | plancher | réseau');
  console.log('--- | --- | --- | --- | --- | --- | ---');
  for (const cas of baseline.panel) {
    const rows = await sbGet<MerchantRow[]>(
      `merchants?select=${MERCHANT_COLUMNS}&name=ilike.*${encodeURIComponent(cas.name)}*&limit=1`,
    );
    if (!rows.length) { console.log(`${cas.name} | INTROUVABLE`); continue; }
    const m = rows[0];
    const extra = m.siret ? await fetchSireneExtra(m.siret) : NO_EXTRA;
    const f = buildFiche(m, extra);
    const repro = f.v1_0_score === cas.score_v1_0 ? '✓' : `≠ (${f.v1_0_score})`;
    console.log(
      `${m.name} | ${cas.score_v1_0} ${cas.band_v1_0} | ${repro} | ${f.score_brut} ${f.bande_brute} | ` +
      `${f.score_operationnel} ${f.bande_operationnelle} | ${f.plancher_applique ? 'OUI' : 'non'} | ${f.signal_reseau}`,
    );
    await sleep(200);
  }
}

async function runFull(): Promise<void> {
  const merchants = await fetchAllMerchants();
  console.log(`Catalogue chargé : ${merchants.length} fiches. Enrichissement SIRENE (GET, throttlé)…`);
  const fiches: FicheReport[] = [];
  let done = 0;
  for (const m of merchants) {
    const extra = m.siret ? await fetchSireneExtra(m.siret) : NO_EXTRA;
    if (m.siret) await sleep(160); // courtoisie API (< 7 req/s)
    fiches.push(buildFiche(m, extra));
    done += 1;
    if (done % 100 === 0) console.log(`  … ${done}/${merchants.length}`);
  }

  const by = <K extends string>(f: (x: FicheReport) => K) =>
    fiches.reduce((acc, x) => { const k = f(x); acc[k] = (acc[k] ?? 0) + 1; return acc; }, {} as Record<string, number>);

  const bandes = by((f) => f.bande_operationnelle);
  const sansSirene = fiches.filter((f) => !f.sources.includes('SIRENE (migration 009)'));
  const apiEchec = fiches.filter((f) => f.sources.includes('SIRENE (migration 009)') && !f.api_enrichie);
  const planchers = fiches.filter((f) => f.plancher_applique);
  const reseaux = fiches.filter((f) => f.signal_reseau === 'SIGNAL_RESEAU_DETECTE');
  const retrogradations = fiches.filter((f) => f.action_proposee === 'RETROGRADATION_PROPOSEE');
  const publiables = fiches.filter((f) => f.action_proposee === 'PUBLICATION_POSSIBLE');
  const changements = fiches.filter((f) => f.changement_bande_v10_v11);
  const hmBasseConfiance = fiches.filter((f) => f.bande_operationnelle === 'HORS-MISSION' && f.confiance === 'basse');
  const seuils = fiches.filter((f) =>
    (f.score_operationnel >= 32 && f.score_operationnel <= 38) ||
    (f.score_operationnel >= 57 && f.score_operationnel <= 62));
  const contradictoires = fiches.filter((f) =>
    (f.preuves_non_pertinence.some((p) => p.includes('fermé')) && f.statut_actuel === 'active') ||
    (f.bande_operationnelle === 'HORS-MISSION' &&
      f.raisons_positives.some((x) => x.startsWith('★4.5') || x.startsWith('★4.6') || x.startsWith('★4.7') || x.startsWith('★4.8') || x.startsWith('★4.9') || x.startsWith('★5'))));
  const franchisesIncertaines = fiches.filter((f) =>
    f.sources.includes('SIRENE (migration 009)') && f.confiance === 'moyenne');

  // NAF « éloignés » rencontrés — revue des faux positifs possibles de l'anneau 3.
  const nafEloignes = new Map<string, number>();
  for (const f of fiches) {
    const p = f.preuves_non_pertinence.find((x) => x.startsWith('NAF éloigné'));
    if (p) nafEloignes.set(p, (nafEloignes.get(p) ?? 0) + 1);
  }

  const synthese = {
    perimetre: merchants.length,
    MISSIONNAIRE: bandes['MISSIONNAIRE'] ?? 0,
    COMPATIBLE: bandes['COMPATIBLE'] ?? 0,
    'HORS-MISSION': bandes['HORS-MISSION'] ?? 0,
    confiance_basse_sans_sirene: sansSirene.length,
    confiance_moyenne_api_echec: apiEchec.length,
    changements_bande_v10_v11: changements.length,
    publies_retrogradation_proposee: retrogradations.length,
    nouveaux_publiables: publiables.length,
    planchers_compatible_appliques: planchers.length,
    signaux_reseau_detectes: reseaux.length,
    independance_inconnue: fiches.filter((f) => f.raisons_positives.some((x) => x.includes('indépendance inconnue'))).length,
    hors_mission_basse_confiance: hmBasseConfiance.length,
  };

  const outDir = join(HERE, 'reports');
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const jsonPath = join(outDir, `dryrun-v1.1-${stamp}.json`);
  writeFileSync(jsonPath, JSON.stringify({ synthese, fiches }, null, 1));

  const li = (fs: FicheReport[], cap = 30) => {
    const lines = fs.slice(0, cap).map((f) =>
      `| ${f.id} | ${f.nom} | ${f.statut_actuel} | ${f.score_brut}→${f.score_operationnel} | ${f.bande_operationnelle} | ${f.confiance} | ${[...f.preuves_non_pertinence, f.raison_du_plancher ?? ''].filter(Boolean).join(' ; ') || '—'} |`);
    const dropped = fs.length - Math.min(fs.length, cap);
    if (dropped > 0) lines.push(`| … | +${dropped} fiches supplémentaires (voir JSON) | | | | | |`);
    return lines.join('\n') || '_(aucune)_';
  };
  const th = '| id | nom | statut | score | bande op. | confiance | preuves / plancher |\n|---|---|---|---|---|---|---|';

  const md = `# Dry-run SPT v1.1 — ${stamp} (LECTURE SEULE)

Périmètre réel : **${merchants.length} fiches** (le chiffre « 863 » de la consigne était un
double-comptage : 737 publiés + 126 SIRENE-first, or les 126 sont inclus dans le total).

## Synthèse

${Object.entries(synthese).map(([k, v]) => `- **${k}** : ${v}`).join('\n')}

Détail intégral par fiche (18 champs) : \`${jsonPath}\`

## Sections de risque

### 1. Publiés proposés en rétrogradation (validation humaine OBLIGATOIRE)
${th}
${li(retrogradations, 60)}

### 2. HORS-MISSION à faible confiance (attendu : 0 par construction du plancher)
${th}
${li(hmBasseConfiance)}

### 3. Fiches sans SIRENE (${sansSirene.length}) — plancher potentiel, jamais punies
${th}
${li(sansSirene, 15)}

### 4. Réseaux / chaînes détectés (preuve INSEE GE/ETI)
${th}
${li(reseaux, 60)}

### 5. Franchises incertaines (test réseau NON exécutable : catégorie INSEE indisponible)
${th}
${li(franchisesIncertaines, 15)}

_Limite documentée : un franchisé purement contractuel (PME mono-étab sans lien capitalistique)
reste indétectable par les preuves officielles disponibles._

### 6. Scores proches des seuils (zones de revue 32–38 et 57–62)
${th}
${li(seuils, 40)}

### 7. Résultats contradictoires (fermé mais actif ; HORS-MISSION malgré ★≥4.5)
${th}
${li(contradictoires)}

### 8. Indépendance inconnue (${synthese.independance_inconnue})
${th}
${li(fiches.filter((f) => f.raisons_positives.some((x) => x.includes('indépendance inconnue'))), 15)}

### 9. Règles à faux positifs possibles
- **Anneau NAF « éloigné » = preuve de non-pertinence** : risque de faux positifs sur les
  services de proximité non cartographiés dans les anneaux. NAF éloignés rencontrés :
${[...nafEloignes.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `  - ${k} × ${v}`).join('\n') || '  - (aucun)'}
- **Catégorie INSEE GE/ETI = réseau** : faux positif théorique si une entreprise
  authentiquement locale appartient à un groupe (rare sur ce territoire, à revoir cas par cas).
- **Plancher COMPATIBLE** : faux négatif possible (une chaîne non détectée reste publiable) —
  assumé : préférer un faux publiable à un indépendant puni.

## Gouvernance
Aucune écriture effectuée. Toute application future : dry-run relu → validation humaine →
snapshot/rollback → lots contrôlés → vérification post-écriture.
`;
  const mdPath = join(outDir, `dryrun-v1.1-${stamp}.md`);
  writeFileSync(mdPath, md);
  console.log(JSON.stringify(synthese, null, 1));
  console.log(`\nRapports :\n  ${mdPath}\n  ${jsonPath}`);
}

if (PANEL_MODE) await runPanel();
else await runFull();
