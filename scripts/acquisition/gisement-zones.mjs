// DRY-RUN GISEMENT ZONES (lecture seule, API gratuite recherche-entreprises).
// Compte les établissements SIRENE actifs par zone (code commune INSEE strict) :
//  - FAÇADE  (Pipeline A) : accueil intrinsèque — bouche 10.71B/C/D+10.13B, 47.2x, 47.61, 47.76, 95.2x
//  - PRODUCTION (Pipeline B) : vignerons/producteurs — 01.x ciblés, 03.22, 11.02 (accueil À PROUVER)
//  - MARCHÉS : 47.8x (modèle lieu-parent, pas d'enrichissement Google-sur-adresse)
// Aucune écriture, aucune clé, aucune dépense.

// Codes INSEE VÉRIFIÉS via geo.api.gouv.fr (leçon : 34118 n'existe pas et l'API
// recherche-entreprises renvoie silencieusement 0 — jamais d'identifiant non vérifié).
const ZONES = {
  'Alès': '30007',
  'Ganges': '34111',
  'Uzès': '30334',
  'Le Vigan': '30350',
  'Lunel': '34145',
};

const GROUPES = {
  facade: '10.71B,10.71C,10.71D,10.13B,47.21Z,47.22Z,47.23Z,47.24Z,47.25Z,47.26Z,47.29Z,47.61Z,47.76Z,95.21Z,95.22Z,95.23Z,95.24Z,95.25Z,95.29Z',
  production: '01.13Z,01.21Z,01.24Z,01.25Z,01.26Z,01.41Z,01.45Z,01.47Z,01.49Z,03.22Z,11.02A,11.02B',
  marches: '47.81Z,47.82Z,47.89Z',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function count(commune, naf) {
  const url = `https://recherche-entreprises.api.gouv.fr/search?activite_principale=${encodeURIComponent(naf)}&code_commune=${commune}&etat_administratif=A&page=1&per_page=1`;
  for (let tent = 0; tent < 3; tent++) {
    const res = await fetch(url);
    if (res.ok) return (await res.json()).total_results;
    await sleep(1000 * (tent + 1));
  }
  return null; // échec = null explicite, jamais 0 (Loi 3 : le silence ne punit pas)
}

async function sondeInstrument(commune) {
  // Contrôle d'instrument : un code commune invalide produit 0 silencieux.
  // On exige que la commune contienne AU MOINS un établissement actif toutes activités.
  const url = `https://recherche-entreprises.api.gouv.fr/search?code_commune=${commune}&etat_administratif=A&page=1&per_page=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`sonde HTTP ${res.status} pour ${commune}`);
  const t = (await res.json()).total_results;
  if (!t) throw new Error(`INSTRUMENT : code commune ${commune} renvoie 0 établissement toutes activités — identifiant invalide probable`);
  return t;
}

const out = {};
for (const [zone, commune] of Object.entries(ZONES)) {
  out[zone] = { commune, etablissements_toutes_activites: await sondeInstrument(commune) };
  await sleep(300);
  for (const [g, naf] of Object.entries(GROUPES)) {
    out[zone][g] = await count(commune, naf);
    await sleep(300);
  }
  console.error(`${zone}: façade=${out[zone].facade} production=${out[zone].production} marchés=${out[zone].marches}`);
}
console.log(JSON.stringify(out, null, 2));
