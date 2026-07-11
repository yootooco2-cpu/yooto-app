import { useMemo, useState } from 'react';

import { MerchantCarousel } from '@/components/home/MerchantCarousel';
import type { Merchant } from '@/features/merchants';
import type { TerritorySource } from '@/features/territory/sources';

/**
 * TerritoryCarousel — carrousel territorial GÉNÉRIQUE (Sprint 1/J3).
 *
 * Le rendu délègue à `MerchantCarousel` (la carte premium PARTAGÉE avec la grille
 * Commerçants : grande image, nom, catégorie, distance, animations échelonnées,
 * tap → fiche) — identique par construction, jamais dupliqué.
 *
 * Ce composant n'est QUE le branchement source → UI : demain « Producteurs
 * vérifiés », « Événements », ou le flux SIRENE-first des créations s'affichent
 * ici sans toucher une ligne d'interface. Vide → n'affiche rien (jamais de
 * section fantôme, jamais de contenu simulé).
 */
export function TerritoryCarousel({
  source,
  merchants,
  delay = 0,
}: {
  source: TerritorySource;
  merchants: Merchant[];
  delay?: number;
}) {
  // Horloge stable au montage : la sélection ne « saute » pas pendant la session.
  const [now] = useState(() => Date.now());
  const items = useMemo(() => source.select(merchants, { now }), [source, merchants, now]);
  if (items.length === 0) return null;
  return (
    <MerchantCarousel title={source.title} subtitle={source.subtitle} merchants={items} delay={delay} />
  );
}
