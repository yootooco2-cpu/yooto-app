/// <reference types="jest" />
import {
  EXCEPTIONAL_GOLD,
  MAP_COLOR_LANGUAGE,
  MARKER_STATE_TOKENS,
  NEUTRAL_MARKER_COLOR,
  mapColorFor,
  withAlpha,
} from './mapMarkers';

// Le langage des couleurs est la SOURCE UNIQUE des teintes de marqueur. Ces tests figent la
// charte (§4) et garantissent qu'aucune catégorie inconnue ne casse le rendu.

describe('langage des couleurs par catégorie', () => {
  it('mappe les catégories de la charte sur les teintes validées', () => {
    expect(mapColorFor('producteur')).toBe('#7D9068'); // vert sauge
    expect(mapColorFor('cafe')).toBe('#5B4636'); // espresso
    expect(mapColorFor('restaurant')).toBe('#C0674A'); // terracotta
    expect(mapColorFor('caviste')).toBe('#7E2E3C'); // bordeaux
    expect(mapColorFor('fleuriste')).toBe('#C06A86'); // rose botanique
    expect(mapColorFor('culture')).toBe('#2F3A63'); // bleu nuit
    expect(mapColorFor('bienetre')).toBe('#8C7BB0'); // lavande
  });

  it('retombe sur le neutre premium pour une catégorie inconnue', () => {
    expect(mapColorFor('inconnue_xyz')).toBe(NEUTRAL_MARKER_COLOR);
    expect(mapColorFor('')).toBe(NEUTRAL_MARKER_COLOR);
  });

  it('donne des teintes DISTINCTES (reconnaître sans lire)', () => {
    const values = Object.values(MAP_COLOR_LANGUAGE);
    expect(new Set(values).size).toBe(values.length);
  });
});

describe('withAlpha', () => {
  it('convertit un hex en rgba', () => {
    expect(withAlpha('#7D9068', 0.16)).toBe('rgba(125, 144, 104, 0.16)');
    expect(withAlpha('#FFFFFF', 1)).toBe('rgba(255, 255, 255, 1)');
  });
});

describe('or exceptionnel — précieux, jamais rouge', () => {
  it('est une teinte or (canal vert élevé), pas un rouge', () => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(EXCEPTIONAL_GOLD.slice(i, i + 2), 16));
    // Un rouge d'alerte aurait g/b très bas ; l'or a un vert élevé et du bleu présent.
    expect(g).toBeGreaterThan(150);
    expect(b).toBeGreaterThan(50);
    expect(r).toBeGreaterThan(g); // chaud, mais pas rouge saturé
  });
});

describe('tokens géométriques des états', () => {
  it('grossit du standard vers exceptionnel, sélectionné intermédiaire', () => {
    expect(MARKER_STATE_TOKENS.standard.size).toBe(40);
    expect(MARKER_STATE_TOKENS.recommended.size).toBe(48);
    expect(MARKER_STATE_TOKENS.exceptional.size).toBe(52);
    expect(MARKER_STATE_TOKENS.selected.size).toBe(46);
  });

  it("donne l'anneau le plus épais et le z le plus haut au sélectionné", () => {
    expect(MARKER_STATE_TOKENS.selected.ring).toBe(5);
    const maxZ = Math.max(...Object.values(MARKER_STATE_TOKENS).map((t) => t.z));
    expect(MARKER_STATE_TOKENS.selected.z).toBe(maxZ);
  });
});
