import { currencyForRegion, resolveDeviceContext } from './deviceContext';

describe('resolveDeviceContext (purement descriptif)', () => {
  it('décompose fr-FR (langue, région, devise factuelle EUR)', () => {
    expect(resolveDeviceContext({ locale: 'fr-FR', timeZone: 'Europe/Paris', colorScheme: 'light' })).toEqual({
      locale: 'fr-FR', language: 'fr', region: 'FR', timeZone: 'Europe/Paris', currency: 'EUR', colorScheme: 'light',
    });
  });

  it('devise déduite de la région (en-US→USD, en-GB→GBP, de-CH→CHF)', () => {
    expect(resolveDeviceContext({ locale: 'en-US' }).currency).toBe('USD');
    expect(resolveDeviceContext({ locale: 'en-GB' }).currency).toBe('GBP');
    expect(resolveDeviceContext({ locale: 'de-CH' }).currency).toBe('CHF');
  });

  it('AUCUN défaut métier : locale absente → tout est null (le consommateur décide)', () => {
    expect(resolveDeviceContext({})).toEqual({
      locale: null, language: null, region: null, timeZone: null, currency: null, colorScheme: null,
    });
  });

  it('locale sans région (fr) → région et devise null (pas d’EUR imposé)', () => {
    const ctx = resolveDeviceContext({ locale: 'fr' });
    expect(ctx.language).toBe('fr');
    expect(ctx.region).toBeNull();
    expect(ctx.currency).toBeNull();
  });

  it('région non mappée → devise null (jamais d’exception)', () => {
    expect(resolveDeviceContext({ locale: 'xx-KE' }).currency).toBeNull();
    expect(resolveDeviceContext({ locale: 'xx-KE' }).region).toBe('KE');
  });

  it('tolère underscore et casse (es_es)', () => {
    expect(resolveDeviceContext({ locale: 'es_es' })).toMatchObject({ language: 'es', region: 'ES', currency: 'EUR' });
  });

  it('colorScheme null si aucune préférence exprimée', () => {
    expect(resolveDeviceContext({ locale: 'fr-FR', colorScheme: null }).colorScheme).toBeNull();
  });
});

describe('currencyForRegion', () => {
  it('mappe ou renvoie null (descriptif)', () => {
    expect(currencyForRegion('FR')).toBe('EUR');
    expect(currencyForRegion('us')).toBe('USD');
    expect(currencyForRegion(null)).toBeNull();
    expect(currencyForRegion('ZZ')).toBeNull();
  });
});
