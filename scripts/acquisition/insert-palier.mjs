// INSERTION PAR PALIER + CONTRÔLES (écritures GO Jason 12/07 — production bassins).
// Usage : node --env-file=.env.local insert-palier.mjs <dryrun.json> <offset> <taille> <rollback.json> [--canari]
// Contrôles post-palier : fermes_encore_actifs=0 · visibilité anon · carto v2 (BAN ≥0,6 sinon inverse).
// Sortie non-zéro = STOP garde-fou.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const [dryrunPath, offsetS, tailleS, rollbackPath, ...flags] = process.argv.slice(2);
const URL_ = process.env.SUPABASE_URL ?? 'https://zdssiposdphjfumsmxaj.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
if (!KEY || !dryrunPath || !rollbackPath) { console.error('usage: insert-palier.mjs <dryrun.json> <offset> <taille> <rollback.json> [--canari]'); process.exit(1); }
const offset = Number(offsetS), taille = Number(tailleS);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

const dry = JSON.parse(readFileSync(dryrunPath, 'utf8'));
const passes = dry.lots.filter((l) => l.sortie === 'PASS' && l.insert);
const lot = passes.slice(offset, offset + taille).map((l) => l.insert);
if (!lot.length) { console.log('palier vide — rien à faire'); process.exit(0); }

// CANARI : insert réel + delete réel d'un payload, prouve le rollback AVANT le lot.
if (flags.includes('--canari')) {
  const c = { ...lot[0], name: `${lot[0].name} [CANARI]` };
  const r = await fetch(`${URL_}/rest/v1/merchants`, { method: 'POST', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify([c]) });
  if (!r.ok) { console.error(`CANARI insert KO: ${r.status} ${await r.text()}`); process.exit(2); }
  const [row] = await r.json();
  const d = await fetch(`${URL_}/rest/v1/merchants?id=eq.${row.id}`, { method: 'DELETE', headers: H });
  if (!d.ok) { console.error(`CANARI delete KO: ${d.status} — id ${row.id} À NETTOYER`); process.exit(2); }
  console.log(`canari OK (insert #${row.id} → delete vérifié)`);
}

// INSERTION par lots de 50.
const ids = [];
for (let i = 0; i < lot.length; i += 50) {
  const chunk = lot.slice(i, i + 50);
  const r = await fetch(`${URL_}/rest/v1/merchants`, { method: 'POST', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify(chunk) });
  if (!r.ok) { console.error(`insert chunk KO: ${r.status} ${await r.text()}`); console.error(`ids déjà insérés: ${JSON.stringify(ids)}`); process.exit(2); }
  ids.push(...(await r.json()).map((x) => x.id));
}
const prev = existsSync(rollbackPath) ? JSON.parse(readFileSync(rollbackPath, 'utf8')) : { ids: [] };
prev.ids.push(...ids);
writeFileSync(rollbackPath, JSON.stringify(prev, null, 1));
console.log(`insérés=${ids.length} (rollback cumulé ${prev.ids.length} ids → ${rollbackPath})`);

// CONTRÔLE 1 : fermes_encore_actifs = 0.
const obj = await (await fetch(`${URL_}/rest/v1/objectif_10000?select=*`, { headers: H })).json();
const fermes = obj.find((m) => m.metric === 'fermes_encore_actifs')?.value;
if (fermes !== 0) { console.error(`GARDE-FOU: fermes_encore_actifs=${fermes}`); process.exit(3); }
console.log('fermes_encore_actifs=0 ✓');

// CONTRÔLE 2 : visibilité anon (RLS) sur le palier.
if (ANON) {
  const rv = await fetch(`${URL_}/rest/v1/merchants?select=id&id=in.(${ids.slice(0, 50).join(',')})`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, Prefer: 'count=exact', Range: '0-0' } });
  const total = Number((rv.headers.get('content-range') ?? '/0').split('/')[1]);
  if (total !== Math.min(ids.length, 50)) { console.error(`GARDE-FOU: visibilité anon ${total}/${Math.min(ids.length, 50)}`); process.exit(3); }
  console.log(`visibilité anon ${total}/${Math.min(ids.length, 50)} ✓`);
}

// CONTRÔLE 3 : carto v2 sur échantillon (déterministe : pas de Math.random en workflow).
const sample = ids.filter((_, i) => i % Math.max(1, Math.floor(ids.length / 12)) === 0).slice(0, 12);
const rows = await (await fetch(`${URL_}/rest/v1/merchants?select=id,name,address,city,latitude,longitude&id=in.(${sample.join(',')})`, { headers: H })).json();
let anomalies = 0;
const distM = (la1, lo1, la2, lo2) => { const p = Math.PI / 180; return 6371000 * Math.hypot((la2 - la1) * p, (lo2 - lo1) * p * Math.cos(((la1 + la2) / 2) * p)); };
for (const m of rows) {
  let ok = false, why = '';
  try {
    const g = await (await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(m.address)}&limit=1`)).json();
    const f = g.features?.[0];
    if (f && f.properties.score >= 0.6) {
      const d = distM(m.latitude, m.longitude, f.geometry.coordinates[1], f.geometry.coordinates[0]);
      ok = d < 200; why = `BAN score=${f.properties.score.toFixed(2)} d=${Math.round(d)}m`;
    }
    if (!ok) { // contre-vérification par géocodage INVERSE (limite d'instrument rural)
      const rev = await (await fetch(`https://api-adresse.data.gouv.fr/reverse/?lat=${m.latitude}&lon=${m.longitude}`)).json();
      const rc = rev.features?.[0]?.properties?.city ?? '';
      ok = rc.localeCompare(m.city, 'fr', { sensitivity: 'base' }) === 0;
      why += ` | inverse city=${rc}`;
    }
  } catch (e) { why += ` | erreur ${e.message}`; }
  if (!ok) { anomalies += 1; console.log(`  carto ? #${m.id} ${m.name} — ${why}`); }
  await sleep(150);
}
const ratio = anomalies / Math.max(1, rows.length);
console.log(`carto: ${anomalies}/${rows.length} anomalies (${Math.round(ratio * 100)} %)`);
if (ratio > 0.05 && anomalies > 1) { console.error('GARDE-FOU: anomalie carto > 5 %'); process.exit(3); }
console.log('PALIER VERT');
