export const YOOTCHAT_ACTIONS = [
  'SEARCH_ACTIVE_MERCHANTS',
  'FILTER_MERCHANTS',
  'RANK_MERCHANTS',
  'GET_MERCHANT_DETAILS',
  'CALCULATE_DISTANCE',
  'COMPARE_MERCHANTS',
  'ASK_CLARIFICATION',
  'RETURN_NO_RESULT',
  'OPEN_MERCHANT_CARD',
  'HAND_OFF_TO_ROUTE',
] as const;
export type YootChatActionName = (typeof YOOTCHAT_ACTIONS)[number];

export interface SearchActiveMerchantsAction {
  readonly action: 'SEARCH_ACTIVE_MERCHANTS';
  readonly params: {
    readonly query: string;
    readonly city?: string;
    readonly categoryIds?: readonly string[];
    readonly radiusKm?: number;
    readonly openNow?: boolean;
    readonly accessibilityRequired?: boolean;
  };
}
export interface FilterMerchantsAction {
  readonly action: 'FILTER_MERCHANTS';
  readonly params: {
    readonly candidateIds: readonly string[];
    readonly categoryIds?: readonly string[];
    readonly openNow?: boolean;
    readonly accessibilityRequired?: boolean;
    readonly maxDistanceKm?: number;
  };
}
export interface RankMerchantsAction {
  readonly action: 'RANK_MERCHANTS';
  readonly params: {
    readonly candidateIds: readonly string[];
    readonly strategy: 'DISTANCE' | 'RELEVANCE' | 'BALANCED';
  };
}
export interface GetMerchantDetailsAction {
  readonly action: 'GET_MERCHANT_DETAILS';
  readonly params: { readonly merchantId: string };
}
export interface CalculateDistanceAction {
  readonly action: 'CALCULATE_DISTANCE';
  readonly params: {
    readonly merchantId: string;
    readonly origin: { readonly latitude: number; readonly longitude: number; readonly precision: 'APPROXIMATE' };
  };
}
export interface CompareMerchantsAction {
  readonly action: 'COMPARE_MERCHANTS';
  readonly params: { readonly merchantIds: readonly string[] };
}
export interface AskClarificationAction {
  readonly action: 'ASK_CLARIFICATION';
  readonly params: {
    readonly missingFields: readonly ('query' | 'city' | 'location' | 'category')[];
    readonly questionKey: 'ASK_NEED' | 'ASK_LOCATION' | 'ASK_CATEGORY';
  };
}
export interface ReturnNoResultAction {
  readonly action: 'RETURN_NO_RESULT';
  readonly params: { readonly reason: 'NO_ACTIVE_CANDIDATE' | 'INSUFFICIENT_EVIDENCE' | 'FILTERS_TOO_STRICT' };
}
export interface OpenMerchantCardAction {
  readonly action: 'OPEN_MERCHANT_CARD';
  readonly params: { readonly merchantId: string };
}
export interface HandOffToRouteAction {
  readonly action: 'HAND_OFF_TO_ROUTE';
  readonly params: { readonly merchantId: string; readonly travelMode: 'WALK' | 'WHEELCHAIR' };
}

export type YootChatAction =
  | SearchActiveMerchantsAction
  | FilterMerchantsAction
  | RankMerchantsAction
  | GetMerchantDetailsAction
  | CalculateDistanceAction
  | CompareMerchantsAction
  | AskClarificationAction
  | ReturnNoResultAction
  | OpenMerchantCardAction
  | HandOffToRouteAction;

export type InterfaceAction = OpenMerchantCardAction | HandOffToRouteAction;
