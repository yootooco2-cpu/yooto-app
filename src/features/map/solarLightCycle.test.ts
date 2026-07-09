import { presetForTime, solarEvents } from './solarLightCycle';

// Montpellier — territoire pilote.
const LAT = 43.6108;
const LNG = 3.8767;

/** Epoch ms d'une heure UTC donnée. */
const utc = (iso: string): number => new Date(iso).getTime();

describe('solarEvents', () => {
  it('encadre correctement le solstice d’été à Montpellier (soleil ~04h04 / ~19h28 UTC)', () => {
    const events = solarEvents(utc('2026-06-21T12:00:00Z'), LAT, LNG);
    expect(events).not.toBeNull();
    const sunrise = new Date(events!.sunriseMs).toISOString();
    const sunset = new Date(events!.sunsetMs).toISOString();
    // Tolérance large (algorithme ±3 min) : on vérifie la fenêtre, pas la minute.
    expect(events!.sunriseMs).toBeGreaterThan(utc('2026-06-21T03:45:00Z'));
    expect(events!.sunriseMs).toBeLessThan(utc('2026-06-21T04:25:00Z'));
    expect(events!.sunsetMs).toBeGreaterThan(utc('2026-06-21T19:10:00Z'));
    expect(events!.sunsetMs).toBeLessThan(utc('2026-06-21T19:50:00Z'));
    // Trace utile si l'assertion casse un jour.
    expect(sunrise < sunset).toBe(true);
  });

  it('retourne null en régime polaire (nuit sans fin à Longyearbyen en décembre)', () => {
    expect(solarEvents(utc('2026-12-21T12:00:00Z'), 78.22, 15.65)).toBeNull();
  });
});

describe('presetForTime (Montpellier, 21 juin 2026)', () => {
  it('night en pleine nuit', () => {
    expect(presetForTime(utc('2026-06-21T01:00:00Z'), LAT, LNG)).toBe('night');
  });
  it('dawn autour du lever (~04h04 UTC)', () => {
    expect(presetForTime(utc('2026-06-21T04:00:00Z'), LAT, LNG)).toBe('dawn');
  });
  it('day en pleine journée', () => {
    expect(presetForTime(utc('2026-06-21T12:00:00Z'), LAT, LNG)).toBe('day');
  });
  it('day encore à 18h30 UTC en été (pas de dusk arbitraire à heure fixe)', () => {
    expect(presetForTime(utc('2026-06-21T18:30:00Z'), LAT, LNG)).toBe('day');
  });
  it('dusk autour du coucher (~19h28 UTC)', () => {
    expect(presetForTime(utc('2026-06-21T19:30:00Z'), LAT, LNG)).toBe('dusk');
  });
  it('night après le crépuscule', () => {
    expect(presetForTime(utc('2026-06-21T21:00:00Z'), LAT, LNG)).toBe('night');
  });
  it('en hiver, dusk tombe bien plus tôt (coucher ~16h15 UTC le 21 déc.)', () => {
    expect(presetForTime(utc('2026-12-21T16:20:00Z'), LAT, LNG)).toBe('dusk');
    expect(presetForTime(utc('2026-12-21T18:30:00Z'), LAT, LNG)).toBe('night');
  });
  it('repli day en régime polaire (lisibilité d’abord)', () => {
    expect(presetForTime(utc('2026-12-21T12:00:00Z'), 78.22, 15.65)).toBe('day');
  });
});
