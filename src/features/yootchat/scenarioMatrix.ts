export const GATE_0_SCENARIO_MATRIX = [
  ['S01', 'Commerce local proche', ['YootChatRequest', 'DISCOVER_LOCAL', 'SEARCH_ACTIVE_MERCHANTS']],
  ['S02', 'Boulangerie locale', ['RequestFilters', 'FILTER_MERCHANTS']],
  ['S03', 'Pharmacie ouverte', ['openNow', 'MerchantClaim']],
  ['S04', 'Serrurier immédiat', ['DISCOVER_LOCAL', 'RANK_MERCHANTS']],
  ['S05', 'Producteur local', ['categoryIds', 'MerchantRecommendation']],
  ['S06', 'Restaurant végétarien', ['services', 'MerchantClaim']],
  ['S07', 'Comparer deux options', ['COMPARE_OPTIONS', 'COMPARE_MERCHANTS']],
  ['S08', 'Détails commerçant', ['MERCHANT_DETAILS', 'GET_MERCHANT_DETAILS']],
  ['S09', 'Distance calculée', ['CALCULATE_DISTANCE', 'distanceKm']],
  ['S10', 'Ouverture inconnue', ['UNKNOWN_HOURS', 'UNKNOWN']],
  ['S11', 'Accessibilité prouvée', ['ACCESSIBILITY', 'VERIFIED_ACCESSIBLE']],
  ['S12', 'Accessibilité inconnue', ['UNKNOWN_ACCESSIBILITY', 'UNKNOWN']],
  ['S13', 'Équipement PMR', ['equipment', 'MerchantClaim']],
  ['S14', 'Service prouvé', ['services', 'MerchantClaim']],
  ['S15', 'Engagement officiel', ['officialCommitments', 'OFFICIAL_SOURCE']],
  ['S16', 'Sur mon trajet', ['ROUTE_AND_MOBILITY', 'HAND_OFF_TO_ROUTE']],
  ['S17', 'Ouvrir une fiche', ['OPEN_MERCHANT_CARD', 'InterfaceAction']],
  ['S18', 'Demande ambiguë', ['CLARIFICATION', 'ASK_CLARIFICATION']],
  ['S19', 'Ville manquante', ['missingInformation', 'ASK_LOCATION']],
  ['S20', 'Aucun résultat', ['NO_RESULT', 'RETURN_NO_RESULT']],
  ['S21', 'Filtres trop stricts', ['FILTERS_TOO_STRICT', 'NO_RESULT']],
  ['S22', 'Hors périmètre', ['OUT_OF_SCOPE', 'OUT_OF_SCOPE']],
  ['S23', 'Action engageante', ['FORBIDDEN_ACTION', 'validateAction']],
  ['S24', 'Commerçant inactif', ['active', 'validateCandidate']],
  ['S25', 'Identifiant inventé', ['validateReturnedIds', 'merchantId']],
  ['S26', 'Injection de prompt', ['exact keys', 'DeterministicMessage']],
  ['S27', 'Donnée personnelle', ['detectForbiddenFields', 'UNVERIFIABLE_RESULT']],
  ['S28', 'Service indisponible', ['SERVICE_UNAVAILABLE', 'createSafeFallback']],
  ['S29', 'Réponse sans preuve', ['INSUFFICIENT_EVIDENCE', 'NO_RESULT']],
  ['S30', 'Rangs incohérents', ['rank', 'validateFinalResponse']],
] as const;

export function validateScenarioMatrix(): boolean {
  const ids = GATE_0_SCENARIO_MATRIX.map(([id]) => id);
  return ids.length === 30 && new Set(ids).size === 30 && ids.every((id, index) => id === `S${String(index + 1).padStart(2, '0')}`);
}
