/**
 * enrich-merchant-photos.ts — Pipeline d'enrichissement photos commerçants.
 * ============================================================================
 * Pour chaque commerce encore en fallback (`/fallbacks/store.jpg`), récupère
 * jusqu'à 3 photos Google Places, les uploade dans Supabase Storage
 *   merchant-photos/<google_place_id>/0.jpg  (cover)
 *   merchant-photos/<google_place_id>/1.jpg  (galerie)
 *   merchant-photos/<google_place_id>/2.jpg  (galerie)
 * puis met à jour `cover_photo_url` (= 0.jpg) et `gallery_photos` (= 1/2.jpg),
 * UNIQUEMENT après upload validé. Ne supprime jamais une galerie existante.
 *
 * ⚠️ SCRIPT SERVEUR / LOCAL UNIQUEMENT — utilise la clé `service_role`.
 *    NE JAMAIS importer ce script ni la service_role dans l'app Expo.
 *
 * Variables (fichier d'env NON commité, ex. `.env.local`) :
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (secret), GOOGLE_PLACES_API_KEY
 *
 * Exécution (Node 22.6+ : --experimental-strip-types ; ou `npx tsx`) :
 *   # DRY-RUN (défaut, aucune écriture, aucun appel Google) :
 *   node --experimental-strip-types --env-file=.env.local scripts/enrich-merchant-photos.ts --limit 20
 *   # EXÉCUTION d'un lot :
 *   node --experimental-strip-types --env-file=.env.local scripts/enrich-merchant-photos.ts --execute --limit 50
 *   # AUTOMATIQUE jusqu'à épuisement (lots de 100) :
 *   node --experimental-strip-types --env-file=.env.local scripts/enrich-merchant-photos.ts --execute --auto
 *   # TEST CIBLÉ d'un commerce :
 *   node --experimental-strip-types --env-file=.env.local scripts/enrich-merchant-photos.ts --execute --id 1405
 *
 * Reprise : ne traite que les commerces en fallback ; relie sans re-télécharger
 * si le fichier existe déjà ; n'écrase jamais une vraie photo / une galerie.
 * ============================================================================
 */

import { mkdirSync, writeFileSync } from 'node:fs';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'merchant-photos';
const MAX_BYTES = 10 * 1024 * 1024; // 10 Mo
const MAX_PHOTOS = 3;
const AUTO_BATCH = 100;
const CSV_PATH = 'reports/no-photo-merchants.csv';

type Args = { execute: boolean; auto: boolean; limit: number; offset: number; id?: string };

function parseArgs(argv: string[]): Args {
  const args: Args = { execute: false, auto: false, limit: 10, offset: 0 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--execute') args.execute = true;
    else if (a === '--auto') args.auto = true;
    else if (a === '--limit') args.limit = Number(argv[++i] ?? '10');
    else if (a === '--offset') args.offset = Number(argv[++i] ?? '0');
    else if (a === '--id') args.id = argv[++i];
  }
  if (!Number.isFinite(args.limit) || args.limit <= 0) args.limit = 10;
  if (!Number.isFinite(args.offset) || args.offset < 0) args.offset = 0;
  return args;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    console.error(`✗ Variable d'environnement manquante : ${name}`);
    process.exit(1);
  }
  return value;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const isFallback = (url: string | null) => !!url && /\/fallbacks\//.test(url);

function toStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

interface MerchantRow {
  id: number;
  name: string | null;
  city: string | null;
  google_place_id: string | null;
  cover_photo_url: string | null;
  gallery_photos: unknown;
}

interface FetchedPhoto {
  bytes: Uint8Array;
  contentType: string;
}

const counters = {
  analysed: 0,
  photos_uploaded: 0,
  enriched: 0,
  no_photo: 0,
  errors: 0,
  skipped_real: 0,
  would_fetch: 0,
  would_relink: 0,
};
const noPhotoRows: MerchantRow[] = [];

async function storageFileExists(publicUrl: string): Promise<boolean> {
  try {
    return (await fetch(publicUrl, { method: 'HEAD' })).ok;
  } catch {
    return false;
  }
}

/** Récupère jusqu'à `max` photos Google Places (API legacy), validées, en ordre. */
async function fetchGooglePhotos(
  placeId: string,
  apiKey: string,
  max: number,
): Promise<FetchedPhoto[]> {
  const detailsUrl =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${encodeURIComponent(placeId)}&fields=photos&key=${apiKey}`;
  const details = (await (await fetch(detailsUrl)).json()) as {
    result?: { photos?: { photo_reference: string }[] };
    status?: string;
    error_message?: string;
  };
  if (details.status && details.status !== 'OK') {
    console.log(`  ↳ Places Details status=${details.status} ${details.error_message ?? ''}`);
  }
  const refs = (details.result?.photos ?? []).slice(0, max).map((p) => p.photo_reference);
  const photos: FetchedPhoto[] = [];

  for (const ref of refs) {
    const photoUrl =
      `https://maps.googleapis.com/maps/api/place/photo` +
      `?maxwidth=1000&photo_reference=${encodeURIComponent(ref)}&key=${apiKey}`;
    const imgRes = await fetch(photoUrl);
    const contentType = (imgRes.headers.get('content-type') ?? '').toLowerCase();
    if (!imgRes.ok) {
      console.log(`  ↳ Place Photo HTTP ${imgRes.status} ${imgRes.statusText}`);
      continue;
    }
    const bytes = new Uint8Array(await imgRes.arrayBuffer());
    if (bytes.length === 0 || !contentType.startsWith('image/') || bytes.length > MAX_BYTES) {
      console.log(`  ↳ rejet photo (size=${bytes.length} ct=${contentType || 'inconnu'})`);
      continue;
    }
    photos.push({ bytes, contentType });
    await sleep(120);
  }
  return photos;
}

async function processMerchant(
  supabase: SupabaseClient,
  m: MerchantRow,
  execute: boolean,
  googleKey: string,
): Promise<void> {
  counters.analysed++;
  const placeId = m.google_place_id;
  if (!placeId) return;

  // Ne jamais écraser une vraie photo existante.
  if (!isFallback(m.cover_photo_url)) {
    counters.skipped_real++;
    return;
  }

  const coverPath = `${placeId}/0.jpg`;
  const coverUrl = supabase.storage.from(BUCKET).getPublicUrl(coverPath).data.publicUrl;

  if (!execute) {
    if (await storageFileExists(coverUrl)) {
      counters.would_relink++;
      console.log(`would_relink id=${m.id} (${placeId})`);
    } else {
      counters.would_fetch++;
      console.log(`would_fetch  id=${m.id} (${placeId})`);
    }
    return;
  }

  try {
    const photos = await fetchGooglePhotos(placeId, googleKey, MAX_PHOTOS);
    if (photos.length === 0) {
      counters.no_photo++;
      noPhotoRows.push(m);
      console.log(`no_photo     id=${m.id} (${placeId})`);
      await sleep(150);
      return;
    }

    // Upload aligné sur l'index : photos[0] → 0.jpg, etc. (relink si déjà présent).
    const urls: (string | null)[] = [];
    for (let i = 0; i < photos.length; i++) {
      const path = `${placeId}/${i}.jpg`;
      const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      if (await storageFileExists(publicUrl)) {
        urls[i] = publicUrl;
        continue;
      }
      const up = await supabase.storage
        .from(BUCKET)
        .upload(path, photos[i].bytes, { contentType: photos[i].contentType, upsert: false });
      if (up.error && !/exist/i.test(up.error.message)) {
        counters.errors++;
        console.log(
          `failed       id=${m.id} upload ${path}: ${up.error.message} ` +
            `| size=${photos[i].bytes.length} ct=${photos[i].contentType}`,
        );
        urls[i] = null;
        continue;
      }
      counters.photos_uploaded++;
      urls[i] = publicUrl;
    }

    const cover = urls[0];
    if (!cover) {
      counters.errors++;
      console.log(`failed       id=${m.id} cover 0.jpg indisponible → pas d'update`);
      return;
    }

    const newGallery = urls.slice(1).filter((u): u is string => !!u);
    const existingGallery = toStringArray(m.gallery_photos);
    const mergedGallery = Array.from(new Set([...existingGallery, ...newGallery]));

    const payload: Record<string, unknown> = { cover_photo_url: cover };
    if (mergedGallery.length > 0) payload.gallery_photos = mergedGallery; // jamais de suppression

    const upd = await supabase.from('merchants').update(payload).eq('id', m.id);
    if (upd.error) {
      counters.errors++;
      console.log(`failed       id=${m.id} update: ${upd.error.message}`);
      return;
    }
    counters.enriched++;
    console.log(`enriched     id=${m.id} cover + ${newGallery.length} galerie`);
  } catch (e) {
    counters.errors++;
    console.log(`failed       id=${m.id} ${(e as Error).message}`);
  }

  await sleep(200);
}

const SELECT = 'id, name, city, google_place_id, cover_photo_url, gallery_photos';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const startedAt = Date.now();

  const SUPABASE_URL = requireEnv('SUPABASE_URL');
  const SERVICE_ROLE = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const GOOGLE_KEY = args.execute ? requireEnv('GOOGLE_PLACES_API_KEY') : '';
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  console.log(
    `Mode: ${args.execute ? 'EXÉCUTION' : 'DRY-RUN'}` +
      (args.auto ? ' | AUTO (lots de 100)' : args.id ? ` | id=${args.id}` : ` | limit=${args.limit}`),
  );

  if (args.id) {
    // Test ciblé d'un seul commerce.
    const { data, error } = await supabase.from('merchants').select(SELECT).eq('id', args.id);
    if (error) {
      console.error('✗ Lecture Supabase :', error.message);
      process.exit(1);
    }
    for (const m of (data ?? []) as MerchantRow[]) {
      await processMerchant(supabase, m, args.execute, GOOGLE_KEY);
    }
  } else if (args.auto) {
    // Boucle par lots via curseur d'id (progression garantie → arrêt à found=0).
    let cursor = 0;
    let round = 0;
    for (;;) {
      const { data, error } = await supabase
        .from('merchants')
        .select(SELECT)
        .ilike('cover_photo_url', '%/fallbacks/%')
        .not('google_place_id', 'is', null)
        .gt('id', cursor)
        .order('id', { ascending: true })
        .limit(AUTO_BATCH);
      if (error) {
        console.error('✗ Lecture Supabase :', error.message);
        process.exit(1);
      }
      const batch = (data ?? []) as MerchantRow[];
      if (batch.length === 0) break;
      round++;
      console.log(`\n--- Lot ${round} : ${batch.length} commerces (id > ${cursor}) ---`);
      for (const m of batch) await processMerchant(supabase, m, args.execute, GOOGLE_KEY);
      cursor = Math.max(...batch.map((m) => Number(m.id)));
    }
  } else {
    // Un seul lot (limit/offset).
    const { data, error } = await supabase
      .from('merchants')
      .select(SELECT)
      .ilike('cover_photo_url', '%/fallbacks/%')
      .not('google_place_id', 'is', null)
      .range(args.offset, args.offset + args.limit - 1);
    if (error) {
      console.error('✗ Lecture Supabase :', error.message);
      process.exit(1);
    }
    for (const m of (data ?? []) as MerchantRow[]) {
      await processMerchant(supabase, m, args.execute, GOOGLE_KEY);
    }
  }

  // CSV des commerces sans photo Google (mode execute uniquement).
  if (args.execute && noPhotoRows.length > 0) {
    mkdirSync('reports', { recursive: true });
    const header = 'id,name,city,google_place_id';
    const lines = noPhotoRows.map((m) =>
      [m.id, csvEscape(m.name ?? ''), csvEscape(m.city ?? ''), m.google_place_id ?? ''].join(','),
    );
    writeFileSync(CSV_PATH, [header, ...lines].join('\n') + '\n', 'utf8');
    console.log(`\nCSV écrit : ${CSV_PATH} (${noPhotoRows.length} commerces sans photo)`);
  }

  const durationS = Math.round((Date.now() - startedAt) / 1000);
  console.log('\n=== RAPPORT FINAL ===');
  console.log(`Commerces analysés      : ${counters.analysed}`);
  console.log(`Photos uploadées        : ${counters.photos_uploaded}`);
  console.log(`Commerces enrichis      : ${counters.enriched}`);
  console.log(`Sans photo Google       : ${counters.no_photo}`);
  console.log(`Déjà une vraie photo    : ${counters.skipped_real}`);
  console.log(`Erreurs                 : ${counters.errors}`);
  if (!args.execute) {
    console.log(`(dry-run) à télécharger : ${counters.would_fetch} | à relier : ${counters.would_relink}`);
  }
  console.log(`Durée totale            : ${durationS}s`);
  if (!args.execute) console.log('\nDRY-RUN : rien modifié. Ajoute --execute pour appliquer.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
