// BILAN DE BASSIN — les 9 métriques avant de quitter un territoire (lecture seule).
// Usage : node --env-file=.env.local bilan-bassin.mjs <communes.json>
// communes.json : [{code, nom}] (liste opposable EPCI). Matching ville côté client,
// insensible accents/casse (les villes en base ne sont pas normalisées — dette connue).
import { readFileSync } from 'node:fs';

const communesPath = process.argv[2];
const URL_ = process.env.SUPABASE_URL ?? 'https://zdssiposdphjfumsmxaj.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const communes = JSON.parse(readFileSync(communesPath, 'utf8'));
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const nomSet = new Set(communes.map((c) => norm(c.nom)));

// 1) Estimé SIRENE (façade + production + marchés) par commune — API gratuite.
const FACADE = '10.71B,10.71C,10.71D,10.13B,47.21Z,47.22Z,47.23Z,47.24Z,47.25Z,47.26Z,47.29Z,47.61Z,47.76Z,95.21Z,95.22Z,95.23Z,95.24Z,95.25Z,95.29Z';
const PROD = '01.13Z,01.21Z,01.24Z,01.25Z,01.26Z,01.41Z,01.45Z,01.47Z,01.49Z,03.22Z,11.02A,11.02B';
const MARCHES = '47.81Z,47.82Z,47.89Z';
let estime = { facade: 0, production: 0, marches: 0 };
for (const c of communes) {
  for (const [k, naf] of Object.entries({ facade: FACADE, production: PROD, marches: MARCHES })) {
    for (let t = 0; t < 3; t++) {
      const r = await fetch(`https://recherche-entreprises.api.gouv.fr/search?activite_principale=${encodeURIComponent(naf)}&code_commune=${c.code}&etat_administratif=A&per_page=1`);
      if (r.ok) { estime[k] += (await r.json()).total_results; break; }
      await sleep(800 * (t + 1));
    }
    await sleep(250);
  }
}

// 2) Présents YOOTOO + niveaux + différenciants (vue = source unique des formules).
const rows = [];
for (let from = 0; ; from += 1000) {
  const r = await fetch(`${URL_}/rest/v1/catalogue_niveaux?select=id,status,niveau,est_differenciant,city&order=id.asc`, { headers: { ...H, Range: `${from}-${from + 999}` } });
  const b = await r.json();
  rows.push(...b);
  if (b.length < 1000) break;
}
const dans = rows.filter((r) => nomSet.has(norm(r.city)));
const actifs = dans.filter((r) => r.status === 'active');
const n = (niv) => actifs.filter((r) => r.niveau === niv).length;
const estimeTotal = estime.facade + estime.production + estime.marches;

console.log(JSON.stringify({
  communes: communes.length,
  estime_sirene: { ...estime, total: estimeTotal },
  presents_yootoo: dans.length,
  publies: actifs.length,
  taux_couverture_pct: Math.round((actifs.length / Math.max(1, estimeTotal)) * 1000) / 10,
  premium: n('PREMIUM'), riches: n('RICHE'), standard: n('STANDARD'), minimal: n('MINIMAL'),
  differenciants: actifs.filter((r) => r.est_differenciant).length,
}, null, 1));
