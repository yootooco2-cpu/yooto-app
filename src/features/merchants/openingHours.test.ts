import { resolveOpeningHours } from './openingHours';

describe('resolveOpeningHours', () => {
  afterEach(() => jest.useRealTimers());

  it('marque available=false quand aucun horaire fourni', () => {
    expect(resolveOpeningHours({}).available).toBe(false);
    expect(resolveOpeningHours({ openingHours: [] }).available).toBe(false);
    expect(resolveOpeningHours({ openingHours: ['', '   '] }).available).toBe(false);
  });

  it('n’invente jamais : today reste null si le jour courant est absent des lignes', () => {
    // Mercredi 2026-07-08, mais la liste ne contient que lundi.
    jest.useFakeTimers().setSystemTime(new Date('2026-07-08T10:00:00'));
    const res = resolveOpeningHours({ openingHours: ['lundi: 09:00 – 19:00'] });
    expect(res.available).toBe(true);
    expect(res.today).toBeNull();
    expect(res.week).toHaveLength(1);
  });

  it('détecte le jour courant par nom (robuste à l’ordre) et sépare jour/horaires', () => {
    // 2026-07-08 est un mercredi.
    jest.useFakeTimers().setSystemTime(new Date('2026-07-08T10:00:00'));
    const res = resolveOpeningHours({
      openingHours: ['lundi: 09:00 – 19:00', 'mercredi: 10:00 – 18:00', 'dimanche: Fermé'],
    });
    expect(res.today).toEqual({ day: 'Mercredi', hours: '10:00 – 18:00', isToday: true });
    expect(res.week.find((d) => d.day === 'Dimanche')?.hours).toBe('Fermé');
    expect(res.week.filter((d) => d.isToday)).toHaveLength(1);
  });
});
