import type { FinalResponse, MerchantCandidate, YootChatRequest } from './contracts';
import type { DeterministicEngineResult } from './engine';
import { runDeterministicYootChatEngine } from './engine';
import { createSafeFallback } from './fallbacks';

export const YOOTCHAT_SUPABASE_TABLE = 'merchants' as const;
export const YOOTCHAT_SUPABASE_DEFAULT_LIMIT = 30 as const;
export const YOOTCHAT_SUPABASE_MAX_LIMIT = 100 as const;
export const YOOTCHAT_FINAL_RECOMMENDATION_LIMIT = 3 as const;
export const YOOTCHAT_SUPABASE_TIMEOUT_MS = 1_500 as const;
export const YOOTCHAT_SUPABASE_MAX_QUARANTINE_RATIO = 0.5 as const;

export const YOOTCHAT_SUPABASE_FORBIDDEN_OPERATIONS = [
  'insert',
  'update',
  'upsert',
  'delete',
  'rpc',
  'storage',
  'auth',
  'migration',
  'sqlMutation',
] as const;

export const YOOTCHAT_SUPABASE_PERSONAL_COLUMNS = [
  'email',
  'phone',
  'address',
  'owner_id',
  'user_id',
  'billing',
  'admin_note',
  'internal',
  'token',
  'secret',
] as const;

export const YOOTCHAT_SUPABASE_MERCHANT_COLUMNS = [
  'id',
  'name',
  'status',
  'is_active',
  'city',
  'latitude',
  'longitude',
  'google_rating',
  'category',
  'opening_hours',
  'is_accessible',
  'est_ess',
  'est_bio',
  'artisan_rm',
  'est_societe_mission',
] as const;

export const YOOTCHAT_SUPABASE_MERCHANT_SELECT = YOOTCHAT_SUPABASE_MERCHANT_COLUMNS.join(',');

export type YootChatSupabaseReadEventCode =
  | 'YOOTCHAT_SUPABASE_READ_START'
  | 'YOOTCHAT_SUPABASE_READ_SUCCESS'
  | 'YOOTCHAT_SUPABASE_READ_TIMEOUT'
  | 'YOOTCHAT_SUPABASE_READ_RLS_ERROR'
  | 'YOOTCHAT_SUPABASE_READ_NETWORK_ERROR'
  | 'YOOTCHAT_SUPABASE_ROW_QUARANTINED'
  | 'YOOTCHAT_SUPABASE_FALLBACK'
  | 'YOOTCHAT_SUPABASE_SCHEMA_ERROR';

export type YootChatSupabaseErrorCode =
  | 'LIMIT_OUT_OF_RANGE'
  | 'SUPABASE_UNAVAILABLE'
  | 'SUPABASE_TIMEOUT'
  | 'SUPABASE_RLS_DENIED'
  | 'SUPABASE_NETWORK_ERROR'
  | 'MALFORMED_RESPONSE'
  | 'SCHEMA_INCOMPATIBLE'
  | 'TOO_MANY_INVALID_ROWS'
  | 'NO_ACTIVE_ROWS'
  | 'NO_MATCHING_CANDIDATES'
  | 'LOCATION_UNUSABLE'
  | 'ENGINE_UNCERTIFIED';

export type SourceMerchantQuarantineReason =
  | 'UNKNOWN_PROPERTY'
  | 'INVALID_ID'
  | 'NON_PUBLISHABLE_STATUS'
  | 'INVALID_ACTIVE_FLAG'
  | 'INVALID_NAME'
  | 'INVALID_CATEGORY'
  | 'INVALID_CITY'
  | 'INVALID_COORDINATES'
  | 'INVALID_RATING'
  | 'INVALID_OPENING_HOURS'
  | 'INVALID_ACCESSIBILITY'
  | 'INVALID_OFFICIAL_COMMITMENT'
  | 'DUPLICATE_ID';

export interface SourceMerchantRecord {
  readonly id: string;
  readonly status: 'active';
  readonly isActive: true;
  readonly name: string;
  readonly category: string;
  readonly city: string | null;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly rating: number | null;
  readonly openNow: boolean | null;
  readonly accessibility: 'VERIFIED_ACCESSIBLE' | 'VERIFIED_NOT_ACCESSIBLE' | 'UNKNOWN';
  readonly services: readonly string[];
  readonly equipment: readonly string[];
  readonly officialCommitments: readonly string[];
}

export interface SourceMerchantQuarantine {
  readonly id: string | null;
  readonly reason: SourceMerchantQuarantineReason;
}

export interface YootChatReadFilters {
  readonly city?: string;
  readonly categoryIds?: readonly string[];
  readonly allowedMerchantIds?: readonly string[];
  readonly origin?: {
    readonly latitude: number;
    readonly longitude: number;
    readonly radiusKm?: number;
  };
  readonly limit?: number;
}

export interface YootChatReadRequest {
  readonly filters?: YootChatReadFilters;
}

export interface YootChatReadSuccess {
  readonly ok: true;
  readonly records: readonly SourceMerchantRecord[];
  readonly candidates: readonly MerchantCandidate[];
  readonly quarantined: readonly SourceMerchantQuarantine[];
  readonly rowCount: number;
  readonly acceptedCount: number;
  readonly durationBucketMs: string;
}

export interface YootChatReadFailure {
  readonly ok: false;
  readonly code: YootChatSupabaseErrorCode;
  readonly fallback: FinalResponse;
  readonly quarantined: readonly SourceMerchantQuarantine[];
  readonly rowCount: number;
  readonly acceptedCount: number;
  readonly durationBucketMs: string;
}

export type YootChatReadResult = YootChatReadSuccess | YootChatReadFailure;

export interface YootChatReadObservation {
  readonly code: YootChatSupabaseReadEventCode;
  readonly errorCode?: YootChatSupabaseErrorCode;
  readonly rowCount?: number;
  readonly acceptedCount?: number;
  readonly quarantinedCount?: number;
  readonly durationBucketMs?: string;
  readonly reason?: SourceMerchantQuarantineReason;
}

export type YootChatReadObserver = (event: YootChatReadObservation) => void;

export interface YootChatMerchantReadPort {
  readonly read: (request?: YootChatReadRequest) => Promise<YootChatReadResult>;
}

export interface YootChatReadEngineResult {
  readonly read: YootChatReadResult;
  readonly engine: DeterministicEngineResult;
}

export async function runYootChatWithMerchantReadPort(
  port: YootChatMerchantReadPort,
  request: YootChatRequest,
  filters?: YootChatReadFilters,
): Promise<YootChatReadEngineResult> {
  const read = await port.read({ filters });
  if (!read.ok) {
    return {
      read,
      engine: {
        ok: false,
        errors: [read.code],
        response: read.fallback,
      },
    };
  }

  const engine = runDeterministicYootChatEngine({
    request,
    candidates: read.candidates,
  });

  if (!engine.ok) {
    return {
      read: {
        ok: false,
        code: 'ENGINE_UNCERTIFIED',
        fallback: createSafeFallback('UNAVAILABLE'),
        quarantined: read.quarantined,
        rowCount: read.rowCount,
        acceptedCount: read.acceptedCount,
        durationBucketMs: read.durationBucketMs,
      },
      engine,
    };
  }

  return { read, engine };
}
