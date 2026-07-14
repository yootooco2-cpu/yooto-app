import { useQuery } from '@tanstack/react-query';

import { fetchCalendar, fetchRoutes, fetchStopSchedule, fetchStops, fetchStopServices } from './repository';

/** Clés de cache TanStack Query — domaine transit (jamais mélangé aux merchants). */
export const transitKeys = {
  stops: ['transit', 'stops'] as const,
  routes: ['transit', 'routes'] as const,
  stopServices: ['transit', 'stop-services'] as const,
  calendar: ['transit', 'calendar'] as const,
  schedule: (stopId: string) => ['transit', 'schedule', stopId] as const,
};

const HOUR = 3600 * 1000;

/** Référentiel arrêts (statique au fil de la journée). */
export function useTransitStops() {
  return useQuery({ queryKey: transitKeys.stops, queryFn: fetchStops, staleTime: 12 * HOUR });
}

export function useTransitRoutes() {
  return useQuery({ queryKey: transitKeys.routes, queryFn: fetchRoutes, staleTime: 12 * HOUR });
}

export function useTransitStopServices() {
  return useQuery({ queryKey: transitKeys.stopServices, queryFn: fetchStopServices, staleTime: 12 * HOUR });
}

export function useTransitCalendar() {
  return useQuery({ queryKey: transitKeys.calendar, queryFn: fetchCalendar, staleTime: 6 * HOUR });
}

/** Horaires théoriques d'un arrêt — rafraîchissables (bouton Actualiser → refetch). */
export function useStopSchedule(stopId: string | undefined) {
  return useQuery({
    queryKey: transitKeys.schedule(stopId ?? ''),
    queryFn: () => fetchStopSchedule(stopId as string),
    enabled: Boolean(stopId),
    staleTime: 5 * 60 * 1000,
  });
}
