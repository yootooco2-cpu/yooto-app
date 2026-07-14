import { useMemo, useState } from 'react';

import { mergeRealtime, useRealtimeDepartures } from './realtime';
import { computeNextDepartures, groupDepartures } from './schedule';
import { useStopSchedule, useTransitCalendar } from './queries';
import type { Station } from './stations';
import type { Departure } from './types';

/**
 * SOURCE UNIQUE du calcul « prochains départs » d'une station (tous quais) —
 * partagée entre la fiche plein écran et le bottom sheet de la carte.
 * Temps réel appliqué UNIQUEMENT si le flux officiel est frais (≤ 300 s).
 */
export function useStationDepartures(station: Station | undefined) {
  const calendar = useTransitCalendar();
  const schedule = useStopSchedule(station?.stopIds);
  const realtime = useRealtimeDepartures(station?.stopIds);
  const [now, setNow] = useState(() => new Date());

  const departures: Departure[] = useMemo(() => {
    if (!schedule.data || !calendar.data) return [];
    const tripsById = new Map(schedule.data.trips.map((t) => [t.tripId, t]));
    const servicesById = new Map(calendar.data.services.map((s) => [s.serviceId, s]));
    const exceptions = new Map(calendar.data.exceptions.map((e) => [`${e.serviceId}|${e.date}`, e.exceptionType]));
    const theoretical = computeNextDepartures({ stopTimes: schedule.data.stopTimes, tripsById, servicesById, exceptions, now });
    return mergeRealtime(theoretical, realtime.data, station?.stopIds ?? []);
  }, [schedule.data, calendar.data, now, realtime.data, station?.stopIds]);

  return {
    now,
    departures,
    groups: useMemo(() => groupDepartures(departures, 3), [departures]),
    rtFresh: realtime.data?.fresh === true,
    alerts: realtime.data?.alerts ?? [],
    loading: schedule.isLoading || calendar.isLoading,
    error: schedule.isError,
    refresh: () => { setNow(new Date()); void schedule.refetch(); void realtime.refetch(); },
  };
}
