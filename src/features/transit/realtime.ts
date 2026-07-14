import { useQuery } from '@tanstack/react-query';

import type { Departure } from './types';

/**
 * Temps réel GTFS-RT via l'Edge Function `transit-rt` (serveur — aucune dépendance au
 * poste local, aucun secret dans l'app : flux publics derrière le JWT anon standard).
 * Le libellé « Temps réel » n'est accordé QUE si le flux est frais (≤ 300 s) ; sinon
 * l'app reste explicitement sur l'horaire théorique.
 */

export interface RealtimeUpdate { trip_id: string; stop_id: string; epoch_ms: number }
export interface RealtimePayload { fresh: boolean; age_seconds: number | null; updates: RealtimeUpdate[]; alerts: string[] }

/**
 * Fusion PURE théorique × temps réel : remplace l'instant des départs dont la course a une
 * mise à jour RT à CET arrêt, marque la source, retrie. Jamais de départ inventé : une mise
 * à jour RT sans départ théorique correspondant est ignorée (sécurité anti-fantôme).
 */
export function mergeRealtime(departures: Departure[], payload: RealtimePayload | undefined, stopIds: string[]): Departure[] {
  if (!payload?.fresh || !payload.updates.length) return departures;
  const wanted = new Set(stopIds);
  // COMPORTEMENT MESURÉ du flux TaM (14/07) : les trip_id GTFS-RT portent un suffixe de
  // version (« 1583344795-3 ») absent du GTFS statique (« 1583344795 »). On matche donc
  // l'id exact PUIS l'id de base — jamais l'inverse, jamais de départ créé.
  const base = (id: string) => id.replace(/-\d+$/, '');
  const byKey = new Map<string, number>();
  for (const u of payload.updates) {
    if (!wanted.has(u.stop_id)) continue;
    byKey.set(`${u.trip_id}|${u.stop_id}`, u.epoch_ms);
    const b = `${base(u.trip_id)}|${u.stop_id}`;
    if (!byKey.has(b)) byKey.set(b, u.epoch_ms);
  }
  if (!byKey.size) return departures;
  return departures
    .map((d) => {
      const rt = d.tripId && d.stopId ? byKey.get(`${d.tripId}|${d.stopId}`) : undefined;
      return rt !== undefined ? { ...d, epochMs: rt, source: 'temps-reel' as const } : d;
    })
    .sort((a, b) => a.epochMs - b.epochMs);
}

async function fetchRealtime(stopIds: string[]): Promise<RealtimePayload> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { fresh: false, age_seconds: null, updates: [], alerts: [] };
  try {
    const res = await fetch(`${url}/functions/v1/transit-rt?stop_id=${encodeURIComponent(stopIds.join(','))}`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as RealtimePayload;
    return { fresh: data.fresh === true, age_seconds: data.age_seconds ?? null, updates: data.updates ?? [], alerts: data.alerts ?? [] };
  } catch {
    // Panne réseau / fonction : repli théorique silencieux et honnête (le badge le dit).
    return { fresh: false, age_seconds: null, updates: [], alerts: [] };
  }
}

export function useRealtimeDepartures(stopIds: string[] | undefined) {
  return useQuery({
    queryKey: ['transit', 'realtime', (stopIds ?? []).join(',')],
    queryFn: () => fetchRealtime(stopIds as string[]),
    enabled: Boolean(stopIds && stopIds.length),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
