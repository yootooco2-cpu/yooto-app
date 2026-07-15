/**
 * Source de candidats client-side (décision produit GATE 1 : pas de
 * PostGIS au MVP).
 *
 * La collection de candidats est fournie EXPLICITEMENT à la construction —
 * aucun hook React, aucun client Supabase, aucun réseau dans le domaine.
 * Le filtrage géographique délègue au corridor + shortlist purs.
 */

import type { MerchantCandidate } from '../domain/types';
import { buildShortlist } from '../domain/shortlist';
import { buildCorridor } from '../geo/corridor';
import type { CandidateQuery, CandidateSourcePort } from '../ports';

export function createStaticCandidateSource(
  candidates: readonly MerchantCandidate[],
): CandidateSourcePort {
  return {
    findCandidates(query: CandidateQuery): Promise<readonly MerchantCandidate[]> {
      const corridorResult = buildCorridor({
        polyline: query.corridor,
        widthMeters: query.corridorWidthMeters,
        // La requête ne porte pas de version de route : 0 = « non versionné ».
        routeVersion: 0,
      });
      // Corridor inconstructible (route vide/invalide) → absence honnête.
      if (!corridorResult.ok) return Promise.resolve([]);

      const byCategory =
        query.categoryIds.length === 0
          ? candidates
          : candidates.filter((candidate) =>
              candidate.categoryIds.some((id) => query.categoryIds.includes(id)),
            );

      const shortlist = buildShortlist(byCategory, corridorResult.corridor, {
        limit: query.limit,
      });
      return Promise.resolve(shortlist.entries.map((entry) => entry.candidate));
    },
  };
}
