import { activityKindChip } from './activityKind';
import type { ActivityKind } from './types';

const ALL_KINDS: ActivityKind[] = [
  'arrivage', 'produit', 'offre', 'evenement', 'degustation', 'concert', 'sortie',
  'marche', 'recolte', 'ouverture', 'fermeture', 'benevolat', 'nouveau_pro', 'annonce',
];

describe('activityKindChip', () => {
  it('donne une chip (libellé + cryptogramme) non vide pour chaque type connu', () => {
    for (const kind of ALL_KINDS) {
      const chip = activityKindChip(kind);
      expect(chip.label.length).toBeGreaterThan(0);
      expect(chip.crypto.length).toBeGreaterThan(0);
    }
  });

  it('mappe quelques types représentatifs (libellé + cryptogramme)', () => {
    expect(activityKindChip('offre')).toEqual({ label: 'Offre', crypto: 'offre' });
    expect(activityKindChip('degustation')).toEqual({ label: 'Dégustation', crypto: 'degustation' });
    expect(activityKindChip('produit')).toEqual({ label: 'Nouveauté', crypto: 'nouveaute' });
    expect(activityKindChip('marche')).toEqual({ label: 'Marché', crypto: 'marche' });
  });

  it('repli neutre pour un type inconnu (robustesse évolutive)', () => {
    const chip = activityKindChip('__inconnu__' as ActivityKind);
    expect(chip.label).toBe('Actualité');
    expect(chip.crypto).toBe('information');
  });
});
