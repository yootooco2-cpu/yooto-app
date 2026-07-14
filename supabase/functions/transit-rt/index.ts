// Edge Function transit-rt — départs temps réel TaM (GTFS-RT officiel), à la demande.
// Sert l'app SANS dépendre du Mac ni du n8n local : résolution des flux via le point
// d'accès national (cache mémoire 1 h), décodage protobuf minimal, fraîcheur ≤ 300 s.
// Aucun secret requis : flux publics, fonction derrière le JWT anon standard.
// GET ?stop_id=<id GTFS>  →  { fresh, age_seconds, updates: [{trip_id, stop_id, epoch_ms}], alerts: [texte] }

const FRESH_MAX_S = 300;
const CATALOG = 'https://transport.data.gouv.fr/api/datasets';

type Feed = { kind: 'trip' | 'alert'; url: string };
let cache: { feeds: Feed[]; at: number } | null = null;
// Cache 30 s du décodage COMPLET : protège le quota TaM (1 fetch par fenêtre, tous
// utilisateurs confondus) — le filtrage par arrêt se fait ensuite en mémoire.
let rtCache: { at: number; headerAge: number | null; updates: { trip_id: string; stop_id: string; epoch_ms: number }[]; alerts: string[] } | null = null;

async function resolveFeeds(): Promise<Feed[]> {
  if (cache && Date.now() - cache.at < 3600_000) return cache.feeds;
  const all = await (await fetch(CATALOG)).json() as { title?: string; resources?: { format?: string; title?: string; url?: string; original_url?: string }[] }[];
  const tam = all.filter((d) => /^réseau urbain( et suburbain)? tam$/i.test((d.title ?? '').trim()));
  const feeds: Feed[] = [];
  for (const d of tam) {
    for (const r of d.resources ?? []) {
      if (!/gtfs-?rt/i.test(r.format ?? '')) continue;
      const url = r.original_url ?? r.url ?? '';
      const t = (r.title ?? url).toLowerCase();
      if (/trajet|trip/.test(t)) feeds.push({ kind: 'trip', url });
      else if (/alerte|alert/.test(t)) feeds.push({ kind: 'alert', url });
    }
  }
  cache = { feeds, at: Date.now() };
  return feeds;
}

// ── Lecteur protobuf minimal (varint + length-delimited), zéro dépendance ──
type Reader = { b: Uint8Array; p: number };
const varint = (r: Reader): bigint => {
  let v = 0n, s = 0n;
  for (;;) {
    const x = BigInt(r.b[r.p++]);
    v |= (x & 0x7Fn) << s;
    if (!(x & 0x80n)) return v;
    s += 7n;
  }
};
const skip = (r: Reader, wire: number) => {
  if (wire === 0) varint(r);
  else if (wire === 2) { const l = Number(varint(r)); r.p += l; }
  else if (wire === 5) r.p += 4;
  else if (wire === 1) r.p += 8;
  else throw new Error('wire ' + wire);
};
const sub = (r: Reader): Reader => { const l = Number(varint(r)); const s = { b: r.b.subarray(r.p, r.p + l), p: 0 }; r.p += l; return s; };
const str = (r: Reader): string => { const l = Number(varint(r)); const s = new TextDecoder().decode(r.b.subarray(r.p, r.p + l)); r.p += l; return s; };
const walk = (r: Reader, on: (field: number, wire: number, r: Reader) => boolean) => {
  while (r.p < r.b.length) {
    const tag = varint(r);
    const field = Number(tag >> 3n), wire = Number(tag & 7n);
    if (!on(field, wire, r)) skip(r, wire);
  }
};

function decodeTripUpdates(buf: Uint8Array, wantedStops: Set<string> | null) {
  let headerTs = 0;
  const updates: { trip_id: string; stop_id: string; epoch_ms: number }[] = [];
  walk({ b: buf, p: 0 }, (f, w, r) => {
    if (f === 1 && w === 2) { // header
      walk(sub(r), (f2, w2, r2) => { if (f2 === 3 && w2 === 0) { headerTs = Number(varint(r2)); return true; } return false; });
      return true;
    }
    if (f === 2 && w === 2) { // entity
      walk(sub(r), (f2, w2, r2) => {
        if (f2 === 3 && w2 === 2) { // trip_update
          let tripId = '';
          const stus: { stop_id: string; epoch: number }[] = [];
          walk(sub(r2), (f3, w3, r3) => {
            if (f3 === 1 && w3 === 2) { // trip descriptor
              walk(sub(r3), (f4, w4, r4) => { if (f4 === 1 && w4 === 2) { tripId = str(r4); return true; } return false; });
              return true;
            }
            if (f3 === 2 && w3 === 2) { // stop_time_update
              let stopId = '', epoch = 0;
              walk(sub(r3), (f4, w4, r4) => {
                if (f4 === 4 && w4 === 2) { stopId = str(r4); return true; }
                if (f4 === 3 && w4 === 2) { // departure StopTimeEvent
                  walk(sub(r4), (f5, w5, r5) => { if (f5 === 2 && w5 === 0) { epoch = Number(varint(r5)) * 1000; return true; } return false; });
                  return true;
                }
                return false;
              });
              if (stopId && epoch) stus.push({ stop_id: stopId, epoch });
              return true;
            }
            return false;
          });
          for (const s of stus) {
            if (!wantedStops || wantedStops.has(s.stop_id)) updates.push({ trip_id: tripId, stop_id: s.stop_id, epoch_ms: s.epoch });
          }
          return true;
        }
        return false;
      });
      return true;
    }
    return false;
  });
  return { headerTs, updates };
}

function decodeAlerts(buf: Uint8Array): string[] {
  const alerts: string[] = [];
  walk({ b: buf, p: 0 }, (f, w, r) => {
    if (f === 2 && w === 2) {
      walk(sub(r), (f2, w2, r2) => {
        if (f2 === 5 && w2 === 2) { // alert
          walk(sub(r2), (f3, w3, r3) => {
            if (f3 === 10 && w3 === 2) { // header_text TranslatedString
              walk(sub(r3), (f4, w4, r4) => {
                if (f4 === 1 && w4 === 2) { // translation
                  let text = '', lang = '';
                  walk(sub(r4), (f5, w5, r5) => {
                    if (f5 === 1 && w5 === 2) { text = str(r5); return true; }
                    if (f5 === 2 && w5 === 2) { lang = str(r5); return true; }
                    return false;
                  });
                  if (text && (lang === '' || lang.startsWith('fr'))) alerts.push(text);
                  return true;
                }
                return false;
              });
              return true;
            }
            return false;
          });
          return true;
        }
        return false;
      });
      return true;
    }
    return false;
  });
  return [...new Set(alerts)].slice(0, 5);
}

Deno.serve(async (req) => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  try {
    const stopParam = new URL(req.url).searchParams.get('stop_id');
    const wantedStops = stopParam ? new Set(stopParam.split(',').map((x) => x.trim()).filter(Boolean)) : null;
    if (!rtCache || Date.now() - rtCache.at > 30_000) {
      const feeds = await resolveFeeds();
      let newestTs = 0;
      const updates: { trip_id: string; stop_id: string; epoch_ms: number }[] = [];
      const alerts: string[] = [];
      for (const f of feeds) {
        try {
          const buf = new Uint8Array(await (await fetch(f.url)).arrayBuffer());
          if (f.kind === 'trip') {
            const d = decodeTripUpdates(buf, null); // décodage complet, filtrage par arrêt ensuite
            newestTs = Math.max(newestTs, d.headerTs);
            updates.push(...d.updates);
          } else {
            alerts.push(...decodeAlerts(buf));
          }
        } catch { /* un flux en panne ou throttlé n'invalide pas les autres */ }
      }
      rtCache = { at: Date.now(), headerAge: newestTs ? Math.round(Date.now() / 1000 - newestTs) : null, updates, alerts };
    }
    const age = rtCache.headerAge === null ? null : rtCache.headerAge + Math.round((Date.now() - rtCache.at) / 1000);
    const fresh = age !== null && age >= -60 && age <= FRESH_MAX_S;
    const filtered = wantedStops ? rtCache.updates.filter((u) => wantedStops.has(u.stop_id)) : rtCache.updates;
    return new Response(JSON.stringify({ fresh, age_seconds: age, updates: fresh ? filtered : [], alerts: rtCache.alerts }), { headers });
  } catch (e) {
    // Échec total → l'app reste sur l'horaire théorique (fallback explicite, jamais inventé).
    return new Response(JSON.stringify({ fresh: false, age_seconds: null, updates: [], alerts: [], error: String(e).slice(0, 120) }), { headers });
  }
});
