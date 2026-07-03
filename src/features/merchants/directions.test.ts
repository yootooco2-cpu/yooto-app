/// <reference types="jest" />
import { buildDirectionsUrl } from './directions';
import type { Merchant } from './types';

function mk(partial: Partial<Merchant>): Merchant {
  return {
    id: 'x',
    name: 'Commerce',
    category: 'shop',
    description: '',
    coordinates: { latitude: 43.6108, longitude: 3.8767 },
    distanceLabel: '—',
    isOpenNow: false,
    isProducer: false,
    isAccessible: false,
    hasRewards: false,
    pin: { x: 0, y: 0 },
    ...partial,
  };
}

describe('buildDirectionsUrl', () => {
  it('utilise les coordonnées quand elles sont plausibles (France)', () => {
    const url = buildDirectionsUrl(mk({ coordinates: { latitude: 43.6108, longitude: 3.8767 } }));
    expect(url).toBe('https://www.google.com/maps/dir/?api=1&destination=43.6108,3.8767');
  });

  it('bascule sur une requête texte (nom + adresse + ville) si coordonnées aberrantes', () => {
    const url = buildDirectionsUrl(
      mk({
        name: 'Café des Arts',
        address: '3 rue Foch',
        city: 'Montpellier',
        coordinates: { latitude: 0, longitude: 0 },
      }),
    );
    expect(url).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=' +
        encodeURIComponent('Café des Arts 3 rue Foch Montpellier'),
    );
  });

  it('ignore les champs manquants dans la requête texte (jamais de "undefined")', () => {
    const url = buildDirectionsUrl(mk({ name: 'Épicerie', coordinates: { latitude: 0, longitude: 0 } }));
    expect(url).toBe('https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent('Épicerie'));
    expect(url).not.toContain('undefined');
  });
});
