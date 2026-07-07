import { DEFAULT_SETTINGS, mergeSettings } from './types';

describe('mergeSettings', () => {
  it('renvoie les défauts pour une entrée vide/null', () => {
    expect(mergeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it('fusionne des réglages partiels sans perdre les clés manquantes', () => {
    const merged = mergeSettings({ notifications: { promotions: false } as never, map: { quality: 'max' } as never });
    expect(merged.notifications.promotions).toBe(false);
    // clés non fournies → valeurs par défaut conservées
    expect(merged.notifications.rewards).toBe(DEFAULT_SETTINGS.notifications.rewards);
    expect(merged.map.quality).toBe('max');
    expect(merged.map.buildings3D).toBe(DEFAULT_SETTINGS.map.buildings3D);
  });
});
