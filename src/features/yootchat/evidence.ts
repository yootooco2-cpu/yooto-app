export const EVIDENCE_LEVELS = ['VERIFIED', 'MEDIUM', 'UNKNOWN', 'FORBIDDEN'] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export const CLAIM_FIELDS = [
  'name',
  'category',
  'city',
  'openNow',
  'rating',
  'accessibility',
  'service',
  'equipment',
  'officialCommitment',
  'distanceKm',
] as const;
export type ClaimField = (typeof CLAIM_FIELDS)[number];

export type ClaimStatus = 'VERIFIED' | 'UNKNOWN' | 'FORBIDDEN';

export interface Evidence {
  readonly level: EvidenceLevel;
  readonly origin: 'YOOTOO_DATABASE' | 'SERVER_CALCULATION' | 'OFFICIAL_SOURCE';
  readonly sourceField: string;
  readonly observedAt?: string;
}

export interface MerchantClaim {
  readonly field: ClaimField;
  readonly value: string | number | boolean | null;
  readonly status: ClaimStatus;
  readonly evidence: Evidence;
}
