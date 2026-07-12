// CARTOGRAPHIE ROI PREMIUM (lecture seule — AUCUNE écriture, AUCUN appel Google).
// Probabilités de gain par champ = mesures empiriques des ~1200 Details payés ce jour.
// Populations : FRAIS (Details complet reçu aujourd'hui → P(gain)≈0, re-payer inutile)
//               vs HISTORIQUE (jamais de Details Contact/Atmosphere → P = empirique).
import { readFileSync, writeFileSync } from 'node:fs';

const URL_ = process.env.SUPABASE_URL ?? 'https://zdssiposdphjfumsmxaj.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

// 1) Probabilités empiriques par champ (fiches TROUVE avec Details du jour).
const trouves = [];
for (const f of ['bassin1', 'bassin2', 'bassin3', 'bassin4', 'poissonneries']) {
  for (const r of JSON.parse(readFileSync(`${f}-enrich.json`, 'utf8'))) {
    if (r.etat === 'TROUVE' && !r.pauvre_au_find && r.place_id && r.rating !== undefined) trouves.push(r);
  }
}
const P = {
  tel: trouves.filter((r) => r.phone).length / trouves.length,
  horaires: trouves.filter((r) => r.opening_hours).length / trouves.length,
  site: trouves.filter((r) => r.website).length / trouves.length,
  photo: trouves.filter((r) => r.photo_ref).length / trouves.length,
  note: trouves.filter((r) => r.rating > 0).length / trouves.length,
  avis: trouves.filter((r) => r.reviews > 0).length / trouves.length,
  categorie: trouves.filter((r) => (r.types ?? []).some((t) => !['establishment', 'point_of_interest', 'store', 'food'].includes(t))).length / trouves.length,
};
// Mesure RÉELLE du lot sonde (50 Details payés) : segment catégorie-historique ≈ 2 %.
const P_CAT_HISTO = 1 / 42;

// 2) Cibles et populations.
const cibles = JSON.parse(readFileSync('premium-cibles.json', 'utf8'));
const excl = new Set(JSON.parse(readFileSync('premium-exclusions.json', 'utf8')));
// journal du lot sonde : fiches déjà interrogées ce soir (P≈0 désormais)
const j = JSON.parse(readFileSync('premium-journal.json', 'utf8'));
const sondees = new Set([...j.inchangees, ...j.completees.map((x) => x.id)]);

// source par id (repère les historiques google_places*)
const src = new Map();
for (let from = 0; ; from += 1000) {
  const r = await fetch(`${URL_}/rest/v1/merchants?select=id,source&status=eq.active&order=id.asc`, { headers: { ...H, Range: `${from}-${from + 999}` } });
  const b = await r.json();
  for (const m of b) src.set(m.id, m.source);
  if (b.length < 1000) break;
}

const segs = new Map();
for (const c of cibles) {
  const pop = excl.has(c.id) || sondees.has(c.id) ? 'FRAIS' : 'HISTO';
  const key = `${c.manque.slice().sort().join('+')} | ${pop}`;
  if (!segs.has(key)) segs.set(key, { manque: c.manque.slice().sort(), pop, ids: [] });
  segs.get(key).ids.push(c.id);
}

// 3) Matrice ROI.
const rows = [];
for (const s of segs.values()) {
  const n = s.ids.length;
  const coutFiche = 0.02 + (s.manque.includes('photo') ? 0.007 : 0);
  let pGain;
  if (s.pop === 'FRAIS') pGain = 0;
  else pGain = s.manque.reduce((p, m) => p * (m === 'categorie' ? P_CAT_HISTO : (P[m] ?? 0.5)), 1);
  const gagnables = Math.round(n * pGain * 10) / 10;
  const cout = Math.round(n * coutFiche * 100) / 100;
  rows.push({
    segment: s.manque.join('+'), population: s.pop, nb: n, avec_place_id: n,
    details_requis: s.pop === 'FRAIS' ? 0 : n, cout_estime: s.pop === 'FRAIS' ? 0 : cout,
    p_gain: Math.round(pGain * 100), premium_gagnables: s.pop === 'FRAIS' ? 0 : gagnables,
    roi_premium_par_dollar: s.pop === 'FRAIS' || !cout ? 0 : Math.round((gagnables / cout) * 100) / 100,
  });
}
rows.sort((a, b) => b.roi_premium_par_dollar - a.roi_premium_par_dollar || b.premium_gagnables - a.premium_gagnables);
writeFileSync('premium-carto.json', JSON.stringify({ P_empiriques: P, base_mesure: trouves.length, segments: rows }, null, 1));
console.log('P empiriques (' + trouves.length + ' Details du jour):', JSON.stringify(Object.fromEntries(Object.entries(P).map(([k, v]) => [k, Math.round(v * 100) + '%']))));
console.table(rows.filter((r) => r.nb >= 2));
