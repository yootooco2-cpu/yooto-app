// ENRICHISSEMENT — PHASE FETCH (dépense Google : Find basic 0,017 $ ; Details ~0,025 $).
// Règle A/B (décision 12/07) : Details payés seulement si le Find laisse espérer A ou B
// (photo présente OU concordance de nom forte). Le pauvre ne coûte plus rien.
// Usage : node --env-file=.env.local enrich-fetch.mjs <ids.json|city:NomVille> <sortie.json>
import { readFileSync, writeFileSync } from 'node:fs';

const [cible, out] = process.argv.slice(2);
const URL_ = process.env.SUPABASE_URL ?? 'https://zdssiposdphjfumsmxaj.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GKEY = process.env.GOOGLE_PLACES_API_KEY;
if (!KEY || !GKEY || !cible || !out) { console.error('usage: enrich-fetch.mjs <ids.json|city:X> <sortie.json>'); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ');
const toks = (s) => new Set(norm(s).split(' ').filter((t) => t.length > 2));
const overlap = (a, b) => { if (!a.size || !b.size) return 0; let n = 0; for (const t of a) if (b.has(t)) n += 1; return n / Math.min(a.size, b.size); };

// Cibles : fiches vérifiées NUES (ni photo ni note) parmi les ids donnés ou la ville donnée.
let filtre;
if (cible.startsWith('city:')) filtre = `city=ilike.${encodeURIComponent(cible.slice(5))}`;
else filtre = `id=in.(${JSON.parse(readFileSync(cible, 'utf8')).ids.join(',')})`;
const targets = [];
for (let from = 0; ; from += 1000) {
  const r = await fetch(`${URL_}/rest/v1/merchants?select=id,name,address,city,latitude,longitude,naf_code&${filtre}&status=eq.active&photo_url=is.null&cover_photo_url=is.null&google_rating=is.null&order=id.asc`, { headers: { ...H, Range: `${from}-${from + 999}` } });
  const b = await r.json();
  if (!Array.isArray(b)) { console.error(JSON.stringify(b).slice(0, 200)); process.exit(2); }
  targets.push(...b);
  if (b.length < 1000) break;
}
console.log(`cibles nues=${targets.length}`);

const rows = [];
let nFind = 0, nDetails = 0;
for (const t of targets) {
  const input = `${t.name}, ${t.address}`;
  const fp = await (await fetch(`https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(input)}&inputtype=textquery&fields=place_id,name,formatted_address,geometry,types,photos&locationbias=circle:2000@${t.latitude},${t.longitude}&key=${GKEY}`)).json();
  nFind += 1;
  const c = fp.candidates?.[0];
  const base = { id: t.id, name: t.name, naf: t.naf_code, lat: t.latitude, lng: t.longitude, city: t.city };
  if (fp.status !== 'OK' || !c) { rows.push({ ...base, etat: 'INTROUVABLE' }); await sleep(60); continue; }
  const nameOv = overlap(toks(t.name), toks(c.name ?? ''));
  const hasPhoto = Boolean(c.photos?.length);
  if (!hasPhoto && nameOv < 0.5) {
    // Pauvre probable (ni photo ni identité concordante) → AUCUN Details payé (niveau C/D).
    rows.push({ ...base, etat: 'TROUVE', place_id: c.place_id, g_name: c.name, types: c.types, g_lat: c.geometry?.location?.lat, g_lng: c.geometry?.location?.lng, pauvre_au_find: true });
    await sleep(60); continue;
  }
  const dt = await (await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${c.place_id}&fields=place_id,name,geometry,formatted_address,types,rating,user_ratings_total,formatted_phone_number,website,opening_hours,business_status,photos&key=${GKEY}`)).json();
  nDetails += 1;
  const d = dt.result ?? {};
  rows.push({
    ...base, etat: 'TROUVE', place_id: d.place_id ?? c.place_id, g_name: d.name ?? c.name,
    g_address: d.formatted_address ?? c.formatted_address,
    rating: d.rating ?? null, reviews: d.user_ratings_total ?? null,
    phone: d.formatted_phone_number ?? null, website: d.website ?? null,
    types: d.types ?? c.types ?? null, business_status: d.business_status ?? null,
    g_lat: d.geometry?.location?.lat ?? c.geometry?.location?.lat,
    g_lng: d.geometry?.location?.lng ?? c.geometry?.location?.lng,
    photo_ref: d.photos?.[0]?.photo_reference ?? null,
    photo_refs: (d.photos ?? []).slice(0, 3).map((p) => p.photo_reference),
    opening_hours: d.opening_hours ?? null,
  });
  await sleep(80);
}
writeFileSync(out, JSON.stringify(rows, null, 1));
const cout = nFind * 0.017 + nDetails * 0.025;
console.log(`find=${nFind} details=${nDetails} coût≈${cout.toFixed(2)}$`);
console.log(`TROUVE=${rows.filter((r) => r.etat === 'TROUVE').length} INTROUVABLE=${rows.filter((r) => r.etat === 'INTROUVABLE').length} pauvres_au_find=${rows.filter((r) => r.pauvre_au_find).length}`);
