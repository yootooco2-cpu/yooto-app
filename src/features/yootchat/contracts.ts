import type { InterfaceAction, YootChatAction } from './actions';
import type { MerchantClaim } from './evidence';
import type { YootChatTopic } from './topics';

export interface ApproximateLocation {
  readonly latitude: number;
  readonly longitude: number;
  readonly precision: 'APPROXIMATE';
}

export interface RequestFilters {
  readonly categoryIds?: readonly string[];
  readonly openNow?: boolean;
  readonly accessibilityRequired?: boolean;
  readonly maxDistanceKm?: number;
}

export interface YootChatRequest {
  readonly message: string;
  readonly language: 'fr' | 'en';
  readonly location?: ApproximateLocation;
  readonly city?: string;
  readonly radiusKm?: number;
  readonly filters?: RequestFilters;
}

export interface UnderstoodIntent {
  readonly topic: YootChatTopic;
  readonly confidence: number;
  readonly missingInformation: readonly ('query' | 'city' | 'location' | 'category')[];
  readonly needsClarification: boolean;
}

export interface ActionPlan {
  readonly topic: YootChatTopic;
  readonly steps: readonly YootChatAction[];
}

export interface CandidateFacts {
  readonly name: string;
  readonly category: string;
  readonly city: string | null;
  readonly openNow: boolean | null;
  readonly rating: number | null;
  readonly accessibility: 'VERIFIED_ACCESSIBLE' | 'VERIFIED_NOT_ACCESSIBLE' | 'UNKNOWN';
  readonly services: readonly string[];
  readonly equipment: readonly string[];
  readonly officialCommitments: readonly string[];
}

export interface MerchantCandidate {
  readonly id: string;
  readonly status: 'active';
  readonly distanceKm: number | null;
  readonly facts: CandidateFacts;
}

export interface MerchantRecommendation {
  readonly merchantId: string;
  readonly rank: number;
  readonly distanceKm: number | null;
  readonly reasons: readonly MerchantClaim[];
}

/**
 * A message is a deterministic template reference, never evidence. Merchant facts
 * may only be conveyed through validated recommendations and claims.
 */
export interface DeterministicMessage {
  readonly template:
    | 'RESULTS_FOUND'
    | 'CLARIFICATION_REQUIRED'
    | 'NO_RESULT'
    | 'OUT_OF_SCOPE'
    | 'SERVICE_UNAVAILABLE';
  readonly variables: {
    readonly resultCount?: number;
    readonly limitationCount?: number;
  };
}

export interface FinalResponse {
  readonly topic: YootChatTopic;
  readonly message: DeterministicMessage;
  readonly recommendations: readonly MerchantRecommendation[];
  readonly limitations: readonly ('UNKNOWN_HOURS' | 'UNKNOWN_ACCESSIBILITY' | 'UNKNOWN_DISTANCE' | 'INSUFFICIENT_EVIDENCE')[];
  readonly interfaceActions: readonly InterfaceAction[];
}

export type YootChatErrorCode =
  | 'INVALID_REQUEST'
  | 'AUTHENTICATION_REQUIRED'
  | 'NO_RESULT'
  | 'INSUFFICIENT_DATA'
  | 'FORBIDDEN_ACTION'
  | 'UNVERIFIABLE_RESULT'
  | 'SERVICE_UNAVAILABLE'
  | 'LIMIT_REACHED';

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly code: YootChatErrorCode; readonly errors: readonly string[] };
