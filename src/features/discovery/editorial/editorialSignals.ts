import type { Signal } from '../types';

import { resolveTier, TIER_PRIOR } from './categoryTiers';

// editorialSignals — signaux éditoriaux du registre (Sprint 2).
//
// `categorySignal` est le PREMIER signal multiplicatif : un gate de priorité de catégorie
// issu de la source unique `resolveTier` / `TIER_PRIOR`. Il rétrograde les catégories
// parasites (couvreur, chatterie…) sans jamais les supprimer (prior ≥ 0.12 > 0).
//
// PROTÉGÉ PAR FEATURE FLAG : renvoie `null` tant que `ctx.extras.rankingV2 !== true`.
// Flag OFF → aucune contribution multiplicative → editorialGate = 1 → ordre actuel inchangé.

/** Vrai si le ranking v2 est actif pour CE contexte (flag transporté dans `extras`). */
function isRankingV2(ctx: { extras?: Readonly<Record<string, unknown>> }): boolean {
  return ctx.extras?.rankingV2 === true;
}

/**
 * Gate éditorial multiplicatif : rétrograde selon le tier de catégorie.
 *  - `mode: 'multiplicative'` → capté par `editorialGate` (produit), HORS moyenne pondérée ;
 *  - `weight: 0` → explicite : ne participe pas à la pertinence contextuelle ;
 *  - pas de `reason` → aucune mention « rétrogradé » ne fuit vers l'UI.
 */
const categorySignal: Signal = (merchant, ctx) => {
  if (!isRankingV2(ctx)) return null;
  const tier = resolveTier(
    merchant.rawCategory,
    merchant.rawMerchantType,
    merchant.name,
    merchant.description,
  );
  return { key: 'category', weight: 0, value: TIER_PRIOR[tier], mode: 'multiplicative' };
};

export const editorialSignals: Signal[] = [categorySignal];
