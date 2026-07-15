/**
 * Shortlist client-side : sélection géographique bornée et auditable des
 * candidats autour d'un corridor.
 *
 * Fonction pure : elle REÇOIT explicitement la collection de candidats —
 * aucun hook React, aucun chargement Supabase, aucun appel réseau, aucune
 * évaluation Matrix ici (le détour précis arrive au Lot 2B/3).
 *
 * Pipeline déterministe :
 *   1. filtrage des coordonnées invalides (compté) ;
 *   2. déduplication stable par merchantId (première occurrence conservée) ;
 *   3. préfiltre bounding box (compté) ;
 *   4. distance précise à l'axe de la route, exclusion hors corridor ;
 *   5. tri stable : distance croissante, puis merchantId croissant ;
 *   6. troncature à la limite configurable (comptée).
 *
 * Complexité : O(N) validation/dédup + O(K·S) distances précises (K =
 * survivants bbox, S = segments) + O(M log M) tri (M = dans le corridor).
 */

import type { Corridor } from '../geo/corridor';
import { CORRIDOR_EPSILON_METERS, distanceToCorridorRouteMeters } from '../geo/corridor';
import { boundingBoxContains, isValidGeoPoint } from '../geo/geometry';
import type { MerchantCandidate } from './types';

export interface ShortlistEntry {
  candidate: MerchantCandidate;
  /** Distance à l'axe de la route (mètres) — PAS un détour : le détour réel viendra du fournisseur de route. */
  distanceToRouteMeters: number;
}

export interface ShortlistAudit {
  inputCount: number;
  invalidCoordinateCount: number;
  duplicateCount: number;
  outsideBoundingBoxCount: number;
  outsideCorridorCount: number;
  withinCorridorCount: number;
  truncatedCount: number;
  limit: number;
  corridorWidthMeters: number;
  routeVersion: number;
}

export interface ShortlistResult {
  entries: readonly ShortlistEntry[];
  audit: ShortlistAudit;
}

export interface ShortlistOptions {
  /** Borne dure du nombre de candidats retournés — jamais de corpus entier. */
  limit: number;
}

function compareEntries(a: ShortlistEntry, b: ShortlistEntry): number {
  if (a.distanceToRouteMeters !== b.distanceToRouteMeters) {
    return a.distanceToRouteMeters - b.distanceToRouteMeters;
  }
  return a.candidate.merchantId < b.candidate.merchantId
    ? -1
    : a.candidate.merchantId > b.candidate.merchantId
      ? 1
      : 0;
}

export function buildShortlist(
  candidates: readonly MerchantCandidate[],
  corridor: Corridor,
  options: ShortlistOptions,
): ShortlistResult {
  const limit = Math.max(0, Math.floor(options.limit));
  let invalidCoordinateCount = 0;
  let duplicateCount = 0;
  let outsideBoundingBoxCount = 0;
  let outsideCorridorCount = 0;

  const seenMerchantIds = new Set<string>();
  const within: ShortlistEntry[] = [];

  for (const candidate of candidates) {
    if (!isValidGeoPoint(candidate.position)) {
      invalidCoordinateCount += 1;
      continue;
    }
    if (seenMerchantIds.has(candidate.merchantId)) {
      duplicateCount += 1;
      continue;
    }
    seenMerchantIds.add(candidate.merchantId);

    if (!boundingBoxContains(corridor.expandedBoundingBox, candidate.position)) {
      outsideBoundingBoxCount += 1;
      continue;
    }
    const distanceToRouteMeters = distanceToCorridorRouteMeters(corridor, candidate.position);
    // Même règle d'inclusion que isInCorridor : limite exacte incluse (epsilon fp).
    if (distanceToRouteMeters > corridor.widthMeters + CORRIDOR_EPSILON_METERS) {
      outsideCorridorCount += 1;
      continue;
    }
    within.push({ candidate, distanceToRouteMeters });
  }

  within.sort(compareEntries);
  const entries = within.slice(0, limit);

  return {
    entries,
    audit: {
      inputCount: candidates.length,
      invalidCoordinateCount,
      duplicateCount,
      outsideBoundingBoxCount,
      outsideCorridorCount,
      withinCorridorCount: within.length,
      truncatedCount: within.length - entries.length,
      limit,
      corridorWidthMeters: corridor.widthMeters,
      routeVersion: corridor.routeVersion,
    },
  };
}
