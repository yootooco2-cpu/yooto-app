// ENRICHISSEMENT — PHASE APPLY (écritures ; PUBLIABLE niveau A/B uniquement).
// Photos téléchargées RÉELLEMENT puis uploadées Storage — une photo qui ne charge pas
// ne compte pas. 409 place_id = doublon révélé → file de fusion, jamais d'écrasement.
// CLOSED_PERMANENTLY = PROPOSITION de dépublication (gate humain), jamais exécutée ici.
// Usage : node --env-file=.env.local enrich-apply.mjs <outcomes.json> <journal.json>
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const [outcomesPath, journalPath] = process.argv.slice(2);
const URL_ = process.env.SUPABASE_URL ?? 'https://zdssiposdphjfumsmxaj.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GKEY = process.env.GOOGLE_PLACES_API_KEY;
if (!KEY || !GKEY || !outcomesPath || !journalPath) { console.error('usage: enrich-apply.mjs <outcomes.json> <journal.json>'); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const outcomes = JSON.parse(readFileSync(outcomesPath, 'utf8'));
const todo = outcomes.filter((o) => o.sortie === 'PUBLIABLE' && (o.niveau === 'A' || o.niveau === 'B'));
const closed = outcomes.filter((o) => o.sortie === 'REJET_REVELE');
const journal = existsSync(journalPath) ? JSON.parse(readFileSync(journalPath, 'utf8'))
  : { appliques: [], conflits_place_id: [], echecs: [], depublications_proposees: [], photos: 0 };

for (const o of todo) {
  if (journal.appliques.some((a) => a.id === o.id)) continue; // reprise idempotente
  // Photos : téléchargement réel → Storage (0.jpg cover, 1-2 galerie).
  const urls = [];
  for (let i = 0; i < (o.photo_refs ?? []).length; i++) {
    try {
      const img = await fetch(`https://maps.googleapis.com/maps/api/place/photo?maxwidth=1000&photo_reference=${encodeURIComponent(o.photo_refs[i])}&key=${GKEY}`);
      const ct = (img.headers.get('content-type') ?? '').toLowerCase();
      const bytes = new Uint8Array(await img.arrayBuffer());
      if (!img.ok || !ct.startsWith('image/') || !bytes.length || bytes.length > 10485760) continue;
      const path = `${o.place_id}/${i}.jpg`;
      const publicUrl = `${URL_}/storage/v1/object/public/merchant-photos/${path}`;
      const head = await fetch(publicUrl, { method: 'HEAD' });
      if (!head.ok) {
        const up = await fetch(`${URL_}/storage/v1/object/merchant-photos/${path}`, {
          method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': ct }, body: bytes,
        });
        if (!up.ok && up.status !== 409) continue;
      }
      urls.push(publicUrl);
      journal.photos += 1;
      await sleep(100);
    } catch { /* photo suivante */ }
  }
  const cover = urls[0] ?? null;
  const before = (await (await fetch(`${URL_}/rest/v1/merchants?select=id,google_place_id,photo_url,cover_photo_url,phone,website,opening_hours,google_rating,reviews_count,category,gallery_photos&id=eq.${o.id}`, { headers: H })).json())[0];
  if (!before) { // fiche retirée entre-temps (rollback ciblé) — jamais recréée ici
    journal.echecs.push({ id: o.id, status: 'ABSENTE', body: 'fiche retirée (rollback ciblé) — skip' });
    continue;
  }
  const payload = {
    google_place_id: o.place_id,
    category: o.gType ?? null,
    google_rating: o.rating ?? null,
    reviews_count: o.reviews ?? null,
    phone: before.phone ?? o.phone ?? null,      // jamais écraser une valeur existante
    website: before.website ?? o.website ?? null,
    opening_hours: o.opening_hours ?? before.opening_hours ?? null,
    ...(cover ? { photo_url: cover, cover_photo_url: cover } : {}),
    ...(urls.length > 1 ? { gallery_photos: urls.slice(1) } : {}),
  };
  const r = await fetch(`${URL_}/rest/v1/merchants?id=eq.${o.id}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
  if (r.status === 409) {
    journal.conflits_place_id.push({ id: o.id, place_id: o.place_id, g_name: o.g_name });
    console.log(`409 doublon révélé #${o.id} (${o.g_name}) → file de fusion`);
  } else if (!r.ok) {
    journal.echecs.push({ id: o.id, status: r.status, body: (await r.text()).slice(0, 150) });
    console.log(`échec #${o.id}: ${r.status}`);
  } else {
    journal.appliques.push({ id: o.id, niveau: o.niveau, avant: before, photo: Boolean(cover) });
    console.log(`enrichi #${o.id} ${o.name} · ${o.niveau} · photo ${cover ? '✓' : '—'}`);
  }
  writeFileSync(journalPath, JSON.stringify(journal, null, 1));
  await sleep(120);
}

for (const c of closed) {
  if (!journal.depublications_proposees.some((d) => d.id === c.id)) {
    journal.depublications_proposees.push({ id: c.id, name: c.name, g_name: c.g_name, place_id: c.place_id });
  }
}
writeFileSync(journalPath, JSON.stringify(journal, null, 1));
console.log(`appliqués=${journal.appliques.length} photos=${journal.photos} conflits=${journal.conflits_place_id.length} échecs=${journal.echecs.length} dépublications_proposées=${journal.depublications_proposees.length}`);
