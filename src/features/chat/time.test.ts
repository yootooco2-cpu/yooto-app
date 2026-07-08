import { formatChatTime } from './time';

const NOW = new Date('2026-07-08T15:00:00Z').getTime();

describe('formatChatTime', () => {
  it('« À l\'instant » sous la minute', () => {
    expect(formatChatTime(new Date(NOW - 30_000).toISOString(), NOW)).toBe("À l'instant");
  });
  it('minutes sous l\'heure', () => {
    expect(formatChatTime(new Date(NOW - 12 * 60_000).toISOString(), NOW)).toBe('12 min');
  });
  it('heure HH:MM le jour même', () => {
    const t = new Date(NOW - 3 * 60 * 60_000).toISOString();
    expect(formatChatTime(t, NOW)).toMatch(/^\d{2}:\d{2}$/);
  });
  it('« Hier » la veille', () => {
    expect(formatChatTime(new Date(NOW - 26 * 60 * 60_000).toISOString(), NOW)).toBe('Hier');
  });
  it('jours dans la semaine', () => {
    expect(formatChatTime(new Date(NOW - 3 * 24 * 60 * 60_000).toISOString(), NOW)).toBe('3 j');
  });
});
