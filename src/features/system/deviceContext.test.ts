import { resolveDeviceContext } from './deviceContext';

describe('resolveDeviceContext', () => {
  it('décompose une locale fr-FR (langue, région, devise EUR)', () => {
    const ctx = resolveDeviceContext({ locale: 'fr-FR', timeZone: 'Europe/Paris', colorScheme: 'light' });
    expect(ctx).toMatchObject({ language: 'fr', region: 'FR', currency: 'EUR', timeZone: 'Europe/Paris', colorScheme: 'light' });
  });

  it('mappe la devise selon la région (en-US → USD, en-GB → GBP, de-CH → CHF)', () => {
    expect(resolveDeviceContext({ locale: 'en-US' }).currency).toBe('USD');
    expect(resolveDeviceContext({ locale: 'en-GB' }).currency).toBe('GBP');
    expect(resolveDeviceContext({ locale: 'de-CH' }).currency).toBe('CHF');
  });

  it('gère une locale sans région (fr) → région null, devise EUR par défaut', () => {
    const ctx = resolveDeviceContext({ locale: 'fr' });
    expect(ctx.region).toBeNull();
    expect(ctx.currency).toBe('EUR');
    expect(ctx.language).toBe('fr');
  });

  it('tolère underscore et casse (es_es)', () => {
    const ctx = resolveDeviceContext({ locale: 'es_es' });
    expect(ctx).toMatchObject({ language: 'es', region: 'ES', currency: 'EUR' });
  });

  it('valeurs par défaut sûres si locale absente', () => {
    const ctx = resolveDeviceContext({});
    expect(ctx.locale).toBe('fr-FR');
    expect(ctx.currency).toBe('EUR');
    expect(ctx.colorScheme).toBe('light');
    expect(ctx.timeZone).toBeNull();
  });

  it('région inconnue → devise EUR par défaut (jamais d’exception)', () => {
    expect(resolveDeviceContext({ locale: 'ja-JP' }).currency).toBe('EUR');
    expect(resolveDeviceContext({ locale: 'ja-JP' }).region).toBe('JP');
  });
});
