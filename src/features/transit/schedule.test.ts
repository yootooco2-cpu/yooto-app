/// <reference types="jest" />
import { computeNextDepartures, formatDeparture, groupDepartures, isServiceActiveOn, parisDayContext, shiftDayKey, weekdayIndex } from './schedule';
import type { TransitService, TransitTrip } from './types';

// Mardi 14 juillet 2026, 14:30:00 à Paris (UTC+2) → 12:30:00Z.
const NOW = new Date('2026-07-14T12:30:00Z');

const svc = (id: string, days: boolean[] = [true, true, true, true, true, true, true]): TransitService =>
  ({ serviceId: id, days: days as TransitService['days'], startDate: '2026-01-01', endDate: '2026-12-31' });
const trip = (tripId: string, routeId: string, serviceId: string, headsign: string): TransitTrip =>
  ({ tripId, routeId, serviceId, headsign, wheelchairAccessible: null });
const maps = (services: TransitService[], trips: TransitTrip[], exceptions: { serviceId: string; date: string; exceptionType: 1 | 2 }[] = []) => ({
  servicesById: new Map(services.map((s) => [s.serviceId, s])),
  tripsById: new Map(trips.map((t) => [t.tripId, t])),
  exceptions: new Map(exceptions.map((e) => [`${e.serviceId}|${e.date}`, e.exceptionType])),
});

describe('parisDayContext / calendrier', () => {
  it('résout la date et l’heure LOCALES Paris (14/07 14:30 → 52200 s)', () => {
    const ctx = parisDayContext(NOW);
    expect(ctx.dayKey).toBe('2026-07-14');
    expect(ctx.secondsIntoDay).toBe(14 * 3600 + 30 * 60);
  });

  it('weekdayIndex : 14/07/2026 est un mardi (index 1)', () => {
    expect(weekdayIndex('2026-07-14')).toBe(1);
    expect(shiftDayKey('2026-07-14', -1)).toBe('2026-07-13');
  });

  it('exception calendar_dates : 2 retire un jour circulé, 1 ajoute un jour non circulé', () => {
    const s = svc('S', [true, true, true, true, true, false, false]);
    const exc = new Map<string, 1 | 2>([['S|2026-07-14', 2], ['S|2026-07-18', 1]]);
    expect(isServiceActiveOn('2026-07-14', s, exc, 'S')).toBe(false); // mardi retiré
    expect(isServiceActiveOn('2026-07-15', s, exc, 'S')).toBe(true);
    expect(isServiceActiveOn('2026-07-18', s, exc, 'S')).toBe(true);  // samedi ajouté
  });
});

describe('computeNextDepartures — prochains départs', () => {
  it('ne retient que les départs à venir dans la fenêtre, triés', () => {
    const { servicesById, tripsById, exceptions } = maps([svc('S')], [trip('t1', 'T1', 'S', 'Odysseum'), trip('t2', 'T1', 'S', 'Odysseum')]);
    const deps = computeNextDepartures({
      stopTimes: [
        { tripId: 't1', departureSecs: 14 * 3600 + 40 * 60 }, // 14:40 → +10 min
        { tripId: 't2', departureSecs: 14 * 3600 + 20 * 60 }, // 14:20 → passé, exclu
      ],
      tripsById, servicesById, exceptions, now: NOW,
    });
    expect(deps).toHaveLength(1);
    expect(new Date(deps[0].epochMs).toISOString()).toBe('2026-07-14T12:40:00.000Z');
    expect(deps[0].source).toBe('theorique');
  });

  it('APRÈS MINUIT : une course 25:30 de la veille part bien à 01:30 le jour même', () => {
    const nuit = new Date('2026-07-14T23:00:00Z'); // 01:00 à Paris le 15/07
    // Service qui ne circule QUE le mardi (14/07) — la course 25:30 appartient au service du 14.
    const { servicesById, tripsById, exceptions } = maps(
      [svc('MARDI', [false, true, false, false, false, false, false])],
      [trip('nuit', 'T1', 'MARDI', 'Mosson')],
    );
    const deps = computeNextDepartures({ stopTimes: [{ tripId: 'nuit', departureSecs: 25 * 3600 + 30 * 60 }], tripsById, servicesById, exceptions, now: nuit });
    expect(deps).toHaveLength(1);
    expect(new Date(deps[0].epochMs).toISOString()).toBe('2026-07-14T23:30:00.000Z'); // 01:30 Paris le 15
  });

  it('APRÈS MINUIT (contre-exemple) : la même course n’apparaît PAS si le service de la veille ne circulait pas', () => {
    const nuit = new Date('2026-07-14T23:00:00Z'); // nuit du mardi 14 au mercredi 15
    const { servicesById, tripsById, exceptions } = maps(
      [svc('LUNDI', [true, false, false, false, false, false, false])], // hier = mardi → inactif
      [trip('nuit', 'T1', 'LUNDI', 'Mosson')],
    );
    const deps = computeNextDepartures({ stopTimes: [{ tripId: 'nuit', departureSecs: 25 * 3600 + 30 * 60 }], tripsById, servicesById, exceptions, now: nuit });
    expect(deps).toHaveLength(0); // jamais d'horaire inventé
  });

  it('service inconnu ou hors plage de dates → aucun départ (le silence ne fabrique rien)', () => {
    const { servicesById, tripsById, exceptions } = maps([{ ...svc('S'), endDate: '2026-06-30' }], [trip('t1', 'T1', 'S', 'X')]);
    const deps = computeNextDepartures({ stopTimes: [{ tripId: 't1', departureSecs: 15 * 3600 }], tripsById, servicesById, exceptions, now: NOW });
    expect(deps).toHaveLength(0);
  });
});

describe('groupDepartures / formatDeparture', () => {
  it('groupe par ligne + direction avec les N prochains, groupes triés par prochain départ', () => {
    const mk = (routeId: string, headsign: string, min: number) =>
      ({ routeId, headsign, epochMs: NOW.getTime() + min * 60000, source: 'theorique' as const });
    const groups = groupDepartures([mk('T2', 'Jacou', 4), mk('T1', 'Mosson', 6), mk('T2', 'Jacou', 12), mk('T2', 'Jacou', 22), mk('T2', 'Jacou', 32)], 3);
    expect(groups.map((g) => `${g.routeId}→${g.headsign}`)).toEqual(['T2→Jacou', 'T1→Mosson']);
    expect(groups[0].next).toHaveLength(3); // plafonné à 3
  });

  it('formatDeparture : minutes proches, puis HH:MM Paris au-delà d’une heure', () => {
    expect(formatDeparture(NOW.getTime() + 5 * 60000, NOW)).toBe('5 min');
    expect(formatDeparture(NOW.getTime() + 90 * 60000, NOW)).toBe('16:00'); // 14:30 + 1 h 30 à Paris
    expect(formatDeparture(NOW.getTime() - 30000, NOW)).toBe('à quai');
  });
});
