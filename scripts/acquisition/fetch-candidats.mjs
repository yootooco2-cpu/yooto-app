// FETCH CANDIDATS SIRENE — Pipeline A (façade), une zone (lecture seule, API gratuite).
// Usage : node fetch-candidats.mjs <code_commune> <sortie.json>
// Filtre STRICTEMENT côté ÉTABLISSEMENT (piège connu : matching_etablissements
// contient le siège même quand son activité diffère — ex. holding 70.10Z à Alès).

// Liste NAF surchargée par env NAF_LIST (ex. gisement « détail spécialisé » GO 12/07) —
// défaut = façade historique.
const FACADE = new Set((process.env.NAF_LIST ?? [
  '10.71B', '10.71C', '10.71D', '10.13B',
  '47.21Z', '47.22Z', '47.23Z', '47.24Z', '47.25Z', '47.26Z', '47.29Z',
  '47.61Z', '47.76Z',
  '95.21Z', '95.22Z', '95.23Z', '95.24Z', '95.25Z', '95.29Z',
].join(',')).split(','));

const [commune, out] = process.argv.slice(2);
if (!commune || !out) { console.error('usage: fetch-candidats.mjs <code_commune> <sortie.json>'); process.exit(1); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Sonde d'instrument (leçon 34118) : la commune doit exister et contenir des établissements.
{
  const r = await fetch(`https://recherche-entreprises.api.gouv.fr/search?code_commune=${commune}&etat_administratif=A&per_page=1`);
  const t = (await r.json()).total_results;
  if (!t) { console.error(`INSTRUMENT : commune ${commune} → 0 établissement toutes activités`); process.exit(2); }
}

const nafParam = [...FACADE].join(',');
const bySiret = new Map();
let page = 1, totalPages = 1;
while (page <= totalPages && page <= 400) {
  const url = `https://recherche-entreprises.api.gouv.fr/search?activite_principale=${encodeURIComponent(nafParam)}&code_commune=${commune}&etat_administratif=A&per_page=25&page=${page}`;
  let d;
  for (let t = 0; t < 4; t++) {
    const res = await fetch(url);
    if (res.ok) { d = await res.json(); break; }
    await sleep(1200 * (t + 1));
  }
  if (!d) { console.error(`ÉCHEC page ${page} après 4 tentatives`); process.exit(2); }
  totalPages = d.total_pages;
  for (const c of d.results) {
    for (const e of c.matching_etablissements ?? []) {
      if (e.commune !== commune) continue;
      if (e.etat_administratif !== 'A') continue;
      if (!FACADE.has(e.activite_principale)) continue;
      if (bySiret.has(e.siret)) continue;
      bySiret.set(e.siret, {
        siret: e.siret,
        nom: c.nom_complet ?? c.nom_raison_sociale ?? '',
        enseignes: e.liste_enseignes ?? null,
        adresse: e.adresse ?? '',
        naf: e.activite_principale,
        etat: e.etat_administratif,
        latitude: e.latitude, longitude: e.longitude,
        date_creation: e.date_creation ?? null,
        categorie_entreprise: c.categorie_entreprise ?? null,
        nb_etablissements: c.nombre_etablissements_ouverts ?? null,
        siege_cp: c.siege?.code_postal ?? null,
        est_ess: Boolean(c.complements?.est_ess),
        est_bio: Boolean(c.complements?.est_bio),
        rm: e.activite_principale_registre_metiers != null,
        non_diffusible: c.statut_diffusion !== 'O',
      });
    }
  }
  page += 1;
  await sleep(350);
}

const cands = [...bySiret.values()];
await import('node:fs').then((fs) => fs.writeFileSync(out, JSON.stringify(cands, null, 1)));
const parNaf = {};
for (const c of cands) parNaf[c.naf] = (parNaf[c.naf] ?? 0) + 1;
console.log(`candidats=${cands.length}`);
console.log(JSON.stringify(parNaf, null, 0));
