import { activityKindChip } from './activityKind';
import type { ActivityKind } from './types';

const ALL_KINDS: ActivityKind[] = [
  'arrivage', 'produit', 'offre', 'evenement', 'degustation', 'concert', 'sortie',
  'marche', 'recolte', 'ouverture', 'fermeture', 'benevolat', 'nouveau_pro', 'annonce',
];

describe('activityKindChip', () => {
  it('donne une chip (libellé + icône) non vide pour chaque type connu', () => {
    for (const kind of ALL_KINDS) {
      const chip = activityKindChip(kind);
      expect(chip.label.length).toBeGreaterThan(0);
      expect(chip.icon.length).toBeGreaterThan(0);
    }
  });

  it('mappe quelques types représentatifs', () => {
    expect(activityKindChip('offre').label).toBe('Offre');
    expect(activityKindChip('degustation').label).toBe('Dégustation');
    expect(activityKindChip('nouveau_pro').label).toBe('Nouveauté');
    expect(activityKindChip('marche').label).toBe('Marché');
  });

  it('repli neutre pour un type inconnu (robustesse évolutive)', () => {
    const chip = activityKindChip('__inconnu__' as ActivityKind);
    expect(chip.label).toBe('Actualité');
    expect(chip.icon).toBe('zap');
  });
});
