import { getSupabaseClient } from '@/lib/supabase/client';

import type { ServiceException, StopService, StopTimeRow, TransitRoute, TransitService, TransitStop, TransitTrip } from './types';

/**
 * Repository transport — tables transit_* UNIQUEMENT (clé anon, RLS lecture publique).
 * Aucun contact avec merchants, aucune écriture. Volumes maîtrisés : arrêts (~2 100) et
 * lignes (45) chargés une fois et mis en cache par TanStack Query ; les horaires sont
 * chargés PAR ARRÊT (quelques centaines de lignes via l'index dédié).
 */

const need = () => {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase non configuré — Bus & Tram indisponible hors ligne.');
  return client;
};

const all = async <T>(query: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T[]> => {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from, from + 999);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return rows;
};

export async function fetchStops(): Promise<TransitStop[]> {
  const c = need();
  const rows = await all<{ id: number; stop_id: string; name: string; latitude: number; longitude: number; wheelchair_boarding: number | null; location_type: number | null }>(
    (from, to) => c.from('transit_stops').select('id,stop_id,name,latitude,longitude,wheelchair_boarding,location_type').order('id').range(from, to),
  );
  return rows.map((r) => ({ id: r.id, stopId: r.stop_id, name: r.name, latitude: r.latitude, longitude: r.longitude, wheelchairBoarding: r.wheelchair_boarding, locationType: r.location_type }));
}

export async function fetchRoutes(): Promise<TransitRoute[]> {
  const { data, error } = await need().from('transit_routes').select('id,route_id,short_name,long_name,route_type,color').limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ id: r.id, routeId: r.route_id, shortName: r.short_name, longName: r.long_name, routeType: r.route_type, color: r.color }));
}

/** Desserte agrégée (021) : pastilles de lignes par arrêt sur l'écran liste. */
export async function fetchStopServices(): Promise<StopService[]> {
  const c = need();
  const rows = await all<{ stop_pk: number; route_pk: number; direction: string }>(
    (from, to) => c.from('transit_stop_services').select('stop_pk,route_pk,direction').order('id').range(from, to),
  );
  return rows.map((r) => ({ stopPk: r.stop_pk, routePk: r.route_pk, direction: r.direction }));
}

export async function fetchCalendar(): Promise<{ services: TransitService[]; exceptions: ServiceException[] }> {
  const c = need();
  const [svc, exc] = await Promise.all([
    c.from('transit_services').select('service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date').limit(1000),
    // Exceptions utiles au calcul « prochains départs » : hier et aujourd'hui suffisent,
    // mais la table est petite → fenêtre large et simple (±2 jours), rejouable.
    c.from('transit_service_exceptions').select('service_id,date,exception_type')
      .gte('date', new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10))
      .lte('date', new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10)),
  ]);
  if (svc.error) throw new Error(svc.error.message);
  if (exc.error) throw new Error(exc.error.message);
  return {
    services: (svc.data ?? []).map((r) => ({
      serviceId: r.service_id,
      days: [r.monday, r.tuesday, r.wednesday, r.thursday, r.friday, r.saturday, r.sunday],
      startDate: r.start_date, endDate: r.end_date,
    })),
    exceptions: (exc.data ?? []).map((r) => ({ serviceId: r.service_id, date: r.date, exceptionType: r.exception_type as 1 | 2 })),
  };
}

/** Horaires d'une STATION (tous ses quais) + courses associées. */
export async function fetchStopSchedule(stopIds: string[]): Promise<{ stopTimes: StopTimeRow[]; trips: TransitTrip[] }> {
  const c = need();
  const st = await all<{ trip_id: string; departure_secs: number; stop_id: string }>(
    (from, to) => c.from('transit_stop_times').select('trip_id,departure_secs,stop_id').in('stop_id', stopIds).order('departure_secs').range(from, to),
  );
  const tripIds = [...new Set(st.map((r) => r.trip_id))];
  const trips: TransitTrip[] = [];
  for (let i = 0; i < tripIds.length; i += 150) {
    const { data, error } = await c.from('transit_trips')
      .select('trip_id,route_id,service_id,headsign,wheelchair_accessible')
      .in('trip_id', tripIds.slice(i, i + 150));
    if (error) throw new Error(error.message);
    trips.push(...(data ?? []).map((r) => ({ tripId: r.trip_id, routeId: r.route_id, serviceId: r.service_id, headsign: r.headsign, wheelchairAccessible: r.wheelchair_accessible })));
  }
  return { stopTimes: st.map((r) => ({ tripId: r.trip_id, departureSecs: r.departure_secs, stopId: r.stop_id })), trips };
}
