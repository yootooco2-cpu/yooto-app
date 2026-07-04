/// <reference types="jest" />
import { EXCEPTIONAL_GOLD, SELECTED_COLOR, mapColorFor, withAlpha } from '@/design/tokens/mapMarkers';

import { markerVisualModel } from './markerVisualModel';

// Le modèle visuel PUR est la seule traduction état+catégorie → pixels. Le rendu ne fait
// qu'appliquer. Ces tests figent les 4 états et l'invariant ADR-002 (jamais de transform).

describe('markerVisualModel — 4 états', () => {
  it('Standard : anneau catégorie fin, petit, halo très subtil', () => {
    const m = markerVisualModel('standard', 'cafe');
    expect(m.size).toBe(40);
    expect(m.borderColor).toBe(mapColorFor('cafe'));
    expect(m.borderWidth).toBe(3);
    expect(m.zIndex).toBe(1);
  });

  it('Recommandé : plus grand, double anneau teinté catégorie (respire)', () => {
    const m = markerVisualModel('recommended', 'restaurant');
    const cat = mapColorFor('restaurant');
    expect(m.size).toBe(48);
    expect(m.borderColor).toBe(cat);
    // Double anneau : un liseré blanc + un anneau plein catégorie dans le box-shadow.
    expect(m.boxShadow).toContain('#FFFFFF');
    expect(m.boxShadow).toContain(withAlpha(cat, 0.9));
  });

  it('Exceptionnel : aura OR (jamais rouge), anneau reste catégorie', () => {
    const m = markerVisualModel('exceptional', 'boulangerie');
    expect(m.size).toBe(52);
    // L'anneau garde la catégorie ; l'AURA est or.
    expect(m.borderColor).toBe(mapColorFor('boulangerie'));
    expect(m.boxShadow).toContain(withAlpha(EXCEPTIONAL_GOLD, 0.95));
    // Aucune trace de la couleur de sélection (vert) ni de rouge d'alerte.
    expect(m.boxShadow).not.toContain(SELECTED_COLOR);
  });

  it('Sélectionné : prime sur l’importance, anneau vert YOOTOO épais, z au sommet', () => {
    const m = markerVisualModel('standard', 'cafe', { selected: true });
    expect(m.size).toBe(46);
    expect(m.borderColor).toBe(SELECTED_COLOR);
    expect(m.borderWidth).toBe(5);
    expect(m.zIndex).toBe(6);
    expect(m.boxShadow).toContain(SELECTED_COLOR);
  });

  it('sélection prime même sur un exceptionnel', () => {
    const m = markerVisualModel('exceptional', 'boulangerie', { selected: true });
    expect(m.borderColor).toBe(SELECTED_COLOR);
    expect(m.size).toBe(46);
  });
});

describe('markerVisualModel — invariants', () => {
  it('n’émet JAMAIS de transform (Mapbox y stocke la position — ADR-002)', () => {
    for (const state of ['standard', 'recommended', 'exceptional'] as const) {
      const m = markerVisualModel(state, 'restaurant', { selected: false });
      expect(JSON.stringify(m)).not.toContain('transform');
      expect(m.boxShadow).not.toContain('transform');
    }
  });

  it('applique toujours une ombre directionnelle (réalisme, lumière haut-gauche)', () => {
    const m = markerVisualModel('standard', 'cafe');
    // Ombre portée décalée bas-droite (offset x et y positifs).
    expect(m.boxShadow).toContain('2px 3px 6px');
  });

  it('catégorie inconnue → neutre premium, sans planter', () => {
    const m = markerVisualModel('standard', 'inconnue_xyz');
    expect(m.borderColor).toBe(mapColorFor('inconnue_xyz'));
  });
});
