// MONTÉE EN PREMIUM — complétion ciblée par ROI (jamais d'écrasement, jamais de retrait).
// Usage : node --env-file=.env.local complete-premium.mjs <cibles.json> <offset> <n> <journal.json> [exclusions.json]
// Un champ n'est écrit QUE s'il est vide/générique en base. CLOSED → proposition gate humain.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const [ciblesPath, offsetS, nS, journalPath, exclPath] = process.argv.slice(2);
const URL_ = process.env.SUPABASE_URL ?? 'https://zdssiposdphjfumsmxaj.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GKEY = process.env.GOOGLE_PLACES_API_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const GENERIC = new Set(['establishment', 'point_of_interest', 'store', 'food', '']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const excl = exclPath ? new Set(JSON.parse(readFileSync(exclPath, 'utf8'))) : new Set();
const cibles = JSON.parse(readFileSync(ciblesPath, 'utf8')).filter((c) => !excl.has(c.id));
const lot = cibles.slice(Number(offsetS), Number(offsetS) + Number(nS));
const journal = existsSync(journalPath) ? JSON.parse(readFileSync(journalPath, 'utf8'))
  : { completees: [], inchangees: [], closed_proposes: [], echecs: [], details: 0, photos: 0 };

for (const c of lot) {
  if (journal.completees.some((x) => x.id === c.id) || journal.inchangees.includes(c.id)) continue;
  const m = (await (await fetch(`${URL_}/rest/v1/merchants?select=id,photo_url,cover_photo_url,opening_hours,phone,website,address,category,google_rating,reviews_count,review_count,google_place_id,gallery_photos&id=eq.${c.id}`, { headers: H })).json())[0];
  if (!m?.google_place_id) { journal.inchangees.push(c.id); continue; }
  const need = {
    photo: !(m.photo_url ?? m.cover_photo_url),
    horaires: m.opening_hours == null,
    tel: !m.phone,
    categorie: GENERIC.has((m.category ?? '').trim()),
    note: !(m.google_rating > 0),
    avis: !((m.reviews_count ?? m.review_count ?? 0) > 0),
  };
  if (!Object.values(need).some(Boolean)) { journal.inchangees.push(c.id); continue; }

  const fields = ['business_status', 'types'];
  if (need.tel) fields.push('formatted_phone_number');
  if (need.horaires) fields.push('opening_hours');
  if (need.tel || need.horaires) fields.push('website'); // Contact déjà facturé → site en bonus
  if (need.note || need.avis) fields.push('rating', 'user_ratings_total');
  if (need.photo) fields.push('photos');
  const dt = await (await fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${m.google_place_id}&fields=${fields.join(',')}&key=${GKEY}`)).json();
  journal.details += 1;
  const d = dt.result ?? {};
  if (dt.status !== 'OK') { journal.echecs.push({ id: c.id, status: dt.status }); await sleep(80); continue; }
  if (d.business_status === 'CLOSED_PERMANENTLY') {
    journal.closed_proposes.push({ id: c.id, name: c.name });
    await sleep(80); continue; // jamais de dégradation ici — gate humain
  }

  const payload = {};
  if (need.tel && d.formatted_phone_number) payload.phone = d.formatted_phone_number;
  if (need.horaires && d.opening_hours) payload.opening_hours = d.opening_hours;
  if (!m.website && d.website) payload.website = d.website;
  if (need.categorie) {
    const t = (d.types ?? []).find((x) => !GENERIC.has(x));
    if (t) payload.category = t;
  }
  if (need.note && d.rating > 0) payload.google_rating = d.rating;
  if (need.avis && d.user_ratings_total > 0) payload.reviews_count = d.user_ratings_total;
  if (need.photo && d.photos?.length) {
    const urls = [];
    for (let i = 0; i < Math.min(3, d.photos.length); i++) {
      try {
        const img = await fetch(`https://maps.googleapis.com/maps/api/place/photo?maxwidth=1000&photo_reference=${encodeURIComponent(d.photos[i].photo_reference)}&key=${GKEY}`);
        const ct = (img.headers.get('content-type') ?? '').toLowerCase();
        const bytes = new Uint8Array(await img.arrayBuffer());
        if (!img.ok || !ct.startsWith('image/') || !bytes.length || bytes.length > 10485760) continue;
        const path = `${m.google_place_id}/${i}.jpg`;
        const pub = `${URL_}/storage/v1/object/public/merchant-photos/${path}`;
        if (!(await fetch(pub, { method: 'HEAD' })).ok) {
          const up = await fetch(`${URL_}/storage/v1/object/merchant-photos/${path}`, { method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': ct }, body: bytes });
          if (!up.ok && up.status !== 409) continue;
        }
        urls.push(pub); journal.photos += 1;
        await sleep(80);
      } catch { /* suivante */ }
    }
    if (urls[0]) { payload.photo_url = urls[0]; payload.cover_photo_url = m.cover_photo_url ?? urls[0]; }
    const extra = urls.slice(1);
    if (extra.length && !(Array.isArray(m.gallery_photos) && m.gallery_photos.length)) payload.gallery_photos = extra;
  }

  if (!Object.keys(payload).length) { journal.inchangees.push(c.id); await sleep(60); continue; }
  const r = await fetch(`${URL_}/rest/v1/merchants?id=eq.${c.id}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
  if (!r.ok) journal.echecs.push({ id: c.id, status: r.status, body: (await r.text()).slice(0, 120) });
  else journal.completees.push({ id: c.id, nb_avant: c.nb, gagnes: Object.keys(payload), avant: m });
  writeFileSync(journalPath, JSON.stringify(journal, null, 1));
  await sleep(80);
}
writeFileSync(journalPath, JSON.stringify(journal, null, 1));
console.log(`complétées=${journal.completees.length} inchangées=${journal.inchangees.length} closed_proposés=${journal.closed_proposes.length} échecs=${journal.echecs.length} details=${journal.details} photos=${journal.photos} coût≈${(journal.details * 0.02 + journal.photos * 0.007).toFixed(2)}$`);
