import type { Departure, StopTimeRow, TransitService, TransitTrip } from './types';

/**
 * Calcul des prochains départs — fonctions PURES (testables sans réseau ni horloge).
 *
 * Deux subtilités GTFS traitées ici :
 *  1. HORAIRES > 24:00 : une course de « 25:30:00 » appartient au service de la VEILLE et
 *     part à 01:30 le lendemain. On évalue donc le jour de service J ET J-1 (décalé de 24 h).
 *  2. FUSEAU Europe/Paris : le « jour de service » est défini en heure locale du réseau,
 *     indépendamment du fuseau de l'appareil (Intl, aucune bibliothèque).
 */

const TZ = 'Europe/Paris';
const DAY_MS = 86_400_000;

const dtf = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, hour12: false,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
});

/** Contexte du jour de service courant à Paris : date locale + début du jour en epoch. */
export function parisDayContext(now: Date): { dayKey: string; secondsIntoDay: number; dayStartMs: number } {
  const p = Object.fromEntries(dtf.formatToParts(now).map((x) => [x.type, x.value]));
  const dayKey = `${p.year}-${p.month}-${p.day}`;
  // Intl peut rendre « 24 » pour minuit selon les moteurs : normalisé.
  const hour = Number(p.hour) % 24;
  const secondsIntoDay = hour * 3600 + Number(p.minute) * 60 + Number(p.second);
  return { dayKey, secondsIntoDay, dayStartMs: now.getTime() - secondsIntoDay * 1000 - (now.getTime() % 1000) };
}

/** Décale une date calendaire YYYY-MM-DD de n jours (arithmétique UTC, sans fuseau). */
export function shiftDayKey(dayKey: string, days: number): string {
  const d = new Date(`${dayKey}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Jour de semaine 0=lundi…6=dimanche d'une date calendaire. */
export function weekdayIndex(dayKey: string): number {
  return (new Date(`${dayKey}T12:00:00Z`).getUTCDay() + 6) % 7;
}

/**
 * Le service circule-t-il ce jour calendaire ? calendar (plage + jours) corrigé par
 * calendar_dates (1 = ajouté, 2 = retiré). Une exception PRIME sur le calendrier.
 */
export function isServiceActiveOn(
  dayKey: string,
  service: TransitService | undefined,
  exceptions: ReadonlyMap<string, 1 | 2>, // clé `${serviceId}|${dayKey}`
  serviceId: string,
): boolean {
  const exc = exceptions.get(`${serviceId}|${dayKey}`);
  if (exc === 2) return false;
  if (exc === 1) return true;
  if (!service) return false;
  if (dayKey < service.startDate || dayKey > service.endDate) return false;
  return service.days[weekdayIndex(dayKey)];
}

export interface ComputeParams {
  stopTimes: StopTimeRow[];
  tripsById: ReadonlyMap<string, TransitTrip>;
  servicesById: ReadonlyMap<string, TransitService>;
  exceptions: ReadonlyMap<string, 1 | 2>;
  now: Date;
  /** Fenêtre d'affichage (défaut 2 h) — jamais d'horaire inventé au-delà des données. */
  windowMs?: number;
}

/** Prochains départs à un arrêt, triés par instant réel, sources théoriques. */
export function computeNextDepartures(params: ComputeParams): Departure[] {
  const { stopTimes, tripsById, servicesById, exceptions, now } = params;
  const windowMs = params.windowMs ?? 2 * 3600 * 1000;
  const ctx = parisDayContext(now);
  const days = [
    { dayKey: shiftDayKey(ctx.dayKey, -1), startMs: ctx.dayStartMs - DAY_MS }, // courses > 24:00 de la veille
    { dayKey: ctx.dayKey, startMs: ctx.dayStartMs },
  ];
  const activeCache = new Map<string, boolean>();
  const isActive = (serviceId: string, dayKey: string): boolean => {
    const k = `${serviceId}|${dayKey}`;
    let v = activeCache.get(k);
    if (v === undefined) {
      v = isServiceActiveOn(dayKey, servicesById.get(serviceId), exceptions, serviceId);
      activeCache.set(k, v);
    }
    return v;
  };

  const out: Departure[] = [];
  const nowMs = now.getTime();
  for (const st of stopTimes) {
    const trip = tripsById.get(st.tripId);
    if (!trip) continue;
    for (const day of days) {
      if (!isActive(trip.serviceId, day.dayKey)) continue;
      const epochMs = day.startMs + st.departureSecs * 1000;
      if (epochMs < nowMs || epochMs > nowMs + windowMs) continue;
      out.push({ tripId: trip.tripId, stopId: st.stopId, routeId: trip.routeId, headsign: trip.headsign ?? '', epochMs, source: 'theorique' });
    }
  }
  return out.sort((a, b) => a.epochMs - b.epochMs);
}

/** Regroupe par ligne + direction, en gardant les `perGroup` prochains départs de chacune. */
export function groupDepartures(departures: Departure[], perGroup = 3): { routeId: string; headsign: string; next: Departure[] }[] {
  const groups = new Map<string, { routeId: string; headsign: string; next: Departure[] }>();
  for (const d of departures) {
    const k = `${d.routeId}|${d.headsign}`;
    let g = groups.get(k);
    if (!g) { g = { routeId: d.routeId, headsign: d.headsign, next: [] }; groups.set(k, g); }
    if (g.next.length < perGroup) g.next.push(d);
  }
  return [...groups.values()].sort((a, b) => a.next[0].epochMs - b.next[0].epochMs);
}

/** « HH:MM » à Paris pour un départ. */
const hm = new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
export function formatDeparture(epochMs: number, now: Date): string {
  const diffMin = Math.round((epochMs - now.getTime()) / 60000);
  if (diffMin <= 0) return 'à quai';
  if (diffMin < 60) return `${diffMin} min`;
  return hm.format(new Date(epochMs));
}
