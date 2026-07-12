// MESURE DU GISEMENT PRESQUE-PREMIUM (lecture seule) — ROI d'abord.
// Critères Premium (mêmes que la vue catalogue_niveaux, Loi 7 : formules identiques) :
// photo, horaires, téléphone, adresse, catégorie spécifique, note>0, avis>0.
import { writeFileSync } from 'node:fs';

const URL_ = process.env.SUPABASE_URL ?? 'https://zdssiposdphjfumsmxaj.supabase.co';
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const GENERIC = new Set(['establishment', 'point_of_interest', 'store', 'food', '']);

const rows = [];
for (let from = 0; ; from += 1000) {
  const r = await fetch(`${URL_}/rest/v1/merchants?select=id,name,city,status,google_place_id,photo_url,cover_photo_url,opening_hours,phone,website,address,category,google_rating,reviews_count,review_count&status=eq.active&order=id.asc`, { headers: { ...H, Range: `${from}-${from + 999}` } });
  const b = await r.json();
  rows.push(...b);
  if (b.length < 1000) break;
}

function manquants(m) {
  const out = [];
  if (!(m.photo_url ?? m.cover_photo_url)) out.push('photo');
  if (m.opening_hours == null) out.push('horaires');
  if (!m.phone) out.push('tel');
  if (!m.address) out.push('adresse');
  if (GENERIC.has((m.category ?? '').trim())) out.push('categorie');
  if (!(m.google_rating > 0)) out.push('note');
  if (!((m.reviews_count ?? m.review_count ?? 0) > 0)) out.push('avis');
  return out;
}

const parNb = {}; const parCritere = {}; const cibles = [];
for (const m of rows) {
  const mq = manquants(m);
  if (!mq.length) continue; // déjà Premium
  const nb = mq.length;
  parNb[nb] = (parNb[nb] ?? 0) + 1;
  if (nb <= 3) {
    for (const c of mq) parCritere[c] = (parCritere[c] ?? 0) + 1;
    cibles.push({ id: m.id, name: m.name, city: m.city, place_id: m.google_place_id, nb, manque: mq });
  }
}
cibles.sort((a, b) => a.nb - b.nb || a.id - b.id);
writeFileSync(process.argv[2] ?? 'premium-cibles.json', JSON.stringify(cibles, null, 1));
console.log('actives:', rows.length, '| par nb manquants:', JSON.stringify(parNb));
console.log('critères manquants (nb≤3):', JSON.stringify(parCritere));
console.log('cibles nb≤3:', cibles.length, '| avec place_id:', cibles.filter((c) => c.place_id).length, '| sans:', cibles.filter((c) => !c.place_id).length);
console.log('manque-1:', cibles.filter((c) => c.nb === 1).length, '| manque-2:', cibles.filter((c) => c.nb === 2).length, '| manque-3:', cibles.filter((c) => c.nb === 3).length);
