import type { MerchantCandidate } from './contracts';
import { createSafeFallback } from './fallbacks';
import {
  YOOTCHAT_SUPABASE_DEFAULT_LIMIT,
  YOOTCHAT_SUPABASE_MAX_LIMIT,
  YOOTCHAT_SUPABASE_MAX_QUARANTINE_RATIO,
  YOOTCHAT_SUPABASE_MERCHANT_COLUMNS,
  YOOTCHAT_SUPABASE_MERCHANT_SELECT,
  YOOTCHAT_SUPABASE_TABLE,
  YOOTCHAT_SUPABASE_TIMEOUT_MS,
  type SourceMerchantQuarantine,
  type SourceMerchantRecord,
  type YootChatMerchantReadPort,
  type YootChatReadFilters,
  type YootChatReadFailure,
  type YootChatReadObservation,
  type YootChatReadObserver,
  type YootChatReadRequest,
  type YootChatReadResult,
  type YootChatSupabaseErrorCode,
} from './readPort';

interface SupabaseQueryError {
  readonly code?: string;
  readonly message?: string;
  readonly name?: string;
}

interface SupabaseQueryResponse {
  readonly data: unknown;
  readonly error: SupabaseQueryError | null;
}

interface ReadOnlyPostgrestBuilder extends PromiseLike<SupabaseQueryResponse> {
  eq(column: string, value: unknown): ReadOnlyPostgrestBuilder;
  not(column: string, operator: string, value: unknown): ReadOnlyPostgrestBuilder;
  in?(column: string, values: readonly unknown[]): ReadOnlyPostgrestBuilder;
  gte?(column: string, value: unknown): ReadOnlyPostgrestBuilder;
  lte?(column: string, value: unknown): ReadOnlyPostgrestBuilder;
  order?(column: string, options?: { readonly ascending?: boolean }): ReadOnlyPostgrestBuilder;
  limit(count: number): ReadOnlyPostgrestBuilder;
  abortSignal?(signal: AbortSignal): ReadOnlyPostgrestBuilder;
}

interface ReadOnlyPostgrestTable {
  select(columns: string): ReadOnlyPostgrestBuilder;
}

export interface ReadOnlySupabaseClient {
  from(table: typeof YOOTCHAT_SUPABASE_TABLE): ReadOnlyPostgrestTable;
}

export interface YootChatSupabaseReadAdapterOptions {
  readonly client: ReadOnlySupabaseClient;
  readonly observer?: YootChatReadObserver;
  readonly timeoutMs?: number;
  readonly now?: () => number;
  readonly createAbortSignal?: (timeoutMs: number) => AbortSignal;
}

type SupabaseMerchantRow = Record<(typeof YOOTCHAT_SUPABASE_MERCHANT_COLUMNS)[number], unknown>;

const allowedRowKeys = new Set<string>(YOOTCHAT_SUPABASE_MERCHANT_COLUMNS);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const nonEmptyString = (value: unknown, max = 200): value is string =>
  typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= max;

const finiteBetween = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

const safeLimit = (value: unknown): number | null => {
  if (value === undefined) return YOOTCHAT_SUPABASE_DEFAULT_LIMIT;
  if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > YOOTCHAT_SUPABASE_MAX_LIMIT) return null;
  return value as number;
};

const validStringList = (value: readonly string[] | undefined, max: number) =>
  value === undefined || (Array.isArray(value) && value.length <= max && value.every((item) => nonEmptyString(item, 128)));

const validateFilters = (filters: YootChatReadFilters | undefined): YootChatSupabaseErrorCode | null => {
  if (!filters) return null;
  if (filters.city !== undefined && !nonEmptyString(filters.city, 120)) return 'SCHEMA_INCOMPATIBLE';
  if (!validStringList(filters.categoryIds, 20)) return 'SCHEMA_INCOMPATIBLE';
  if (!validStringList(filters.allowedMerchantIds, 100)) return 'SCHEMA_INCOMPATIBLE';
  if (filters.origin) {
    if (!finiteBetween(filters.origin.latitude, -90, 90) || !finiteBetween(filters.origin.longitude, -180, 180)) return 'LOCATION_UNUSABLE';
    if (filters.origin.radiusKm !== undefined && !finiteBetween(filters.origin.radiusKm, 0.1, 100)) return 'LOCATION_UNUSABLE';
  }
  return null;
};

const durationBucket = (elapsedMs: number) => {
  if (elapsedMs <= 50) return '0-50';
  if (elapsedMs <= 250) return '51-250';
  if (elapsedMs <= 1_000) return '251-1000';
  return '1001+';
};

const fallbackFailure = (
  code: YootChatSupabaseErrorCode,
  quarantined: readonly SourceMerchantQuarantine[],
  rowCount: number,
  acceptedCount: number,
  durationBucketMs: string,
): YootChatReadFailure => ({
  ok: false,
  code,
  fallback: createSafeFallback(code === 'NO_MATCHING_CANDIDATES' || code === 'NO_ACTIVE_ROWS' ? 'EMPTY' : 'UNAVAILABLE'),
  quarantined,
  rowCount,
  acceptedCount,
  durationBucketMs,
});

const emit = (observer: YootChatReadObserver | undefined, event: YootChatReadObservation) => {
  observer?.(event);
};

const createDefaultAbortSignal = (timeoutMs: number) => {
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    return AbortSignal.timeout(timeoutMs);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
};

const haversineKm = (
  origin: { readonly latitude: number; readonly longitude: number },
  candidate: { readonly latitude: number; readonly longitude: number },
) => {
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(candidate.latitude - origin.latitude);
  const dLon = rad(candidate.longitude - origin.longitude);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(origin.latitude)) * Math.cos(rad(candidate.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const readOpenNow = (value: unknown): boolean | null | 'INVALID' => {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) return 'INVALID';
  if (!('open_now' in value)) return null;
  return typeof value.open_now === 'boolean' ? value.open_now : 'INVALID';
};

const officialCommitments = (row: SupabaseMerchantRow): readonly string[] | 'INVALID' => {
  const mapping: readonly [keyof SupabaseMerchantRow, string][] = [
    ['est_ess', 'Économie sociale et solidaire'],
    ['est_bio', 'Agriculture biologique'],
    ['artisan_rm', 'Artisan inscrit au Répertoire des Métiers'],
    ['est_societe_mission', 'Société à mission'],
  ];
  const commitments: string[] = [];
  for (const [key, label] of mapping) {
    const value = row[key];
    if (value === true) commitments.push(label);
    else if (value !== false && value !== null && value !== undefined) return 'INVALID';
  }
  return commitments;
};

const rowId = (row: unknown): string | null => {
  if (!isRecord(row)) return null;
  const id = row.id;
  if (typeof id === 'number' && Number.isInteger(id) && id > 0) return String(id);
  return nonEmptyString(id, 128) ? id : null;
};

function projectRow(row: unknown): { readonly ok: true; readonly value: SourceMerchantRecord } | { readonly ok: false; readonly quarantine: SourceMerchantQuarantine } {
  const id = rowId(row);
  if (!isRecord(row)) return { ok: false, quarantine: { id, reason: 'UNKNOWN_PROPERTY' } };

  const unknownKeys = Object.keys(row).filter((key) => !allowedRowKeys.has(key));
  if (unknownKeys.length > 0) return { ok: false, quarantine: { id, reason: 'UNKNOWN_PROPERTY' } };
  for (const key of YOOTCHAT_SUPABASE_MERCHANT_COLUMNS) {
    if (!(key in row)) return { ok: false, quarantine: { id, reason: 'UNKNOWN_PROPERTY' } };
  }

  const typed = row as SupabaseMerchantRow;
  if (id === null) return { ok: false, quarantine: { id: null, reason: 'INVALID_ID' } };
  if (typed.status !== 'active') return { ok: false, quarantine: { id, reason: 'NON_PUBLISHABLE_STATUS' } };
  if (typed.is_active !== true) return { ok: false, quarantine: { id, reason: 'INVALID_ACTIVE_FLAG' } };
  if (!nonEmptyString(typed.name, 200)) return { ok: false, quarantine: { id, reason: 'INVALID_NAME' } };
  if (!nonEmptyString(typed.category, 120)) return { ok: false, quarantine: { id, reason: 'INVALID_CATEGORY' } };
  if (typed.city !== null && typed.city !== undefined && !nonEmptyString(typed.city, 120)) {
    return { ok: false, quarantine: { id, reason: 'INVALID_CITY' } };
  }

  const hasLatitude = typed.latitude !== null && typed.latitude !== undefined;
  const hasLongitude = typed.longitude !== null && typed.longitude !== undefined;
  if (hasLatitude !== hasLongitude) return { ok: false, quarantine: { id, reason: 'INVALID_COORDINATES' } };
  if (hasLatitude && (!finiteBetween(typed.latitude, -90, 90) || !finiteBetween(typed.longitude, -180, 180))) {
    return { ok: false, quarantine: { id, reason: 'INVALID_COORDINATES' } };
  }

  if (typed.google_rating !== null && typed.google_rating !== undefined && !finiteBetween(typed.google_rating, 0, 5)) {
    return { ok: false, quarantine: { id, reason: 'INVALID_RATING' } };
  }

  const openNow = readOpenNow(typed.opening_hours);
  if (openNow === 'INVALID') return { ok: false, quarantine: { id, reason: 'INVALID_OPENING_HOURS' } };

  if (typed.is_accessible !== true && typed.is_accessible !== false && typed.is_accessible !== null && typed.is_accessible !== undefined) {
    return { ok: false, quarantine: { id, reason: 'INVALID_ACCESSIBILITY' } };
  }

  const commitments = officialCommitments(typed);
  if (commitments === 'INVALID') return { ok: false, quarantine: { id, reason: 'INVALID_OFFICIAL_COMMITMENT' } };

  return {
    ok: true,
    value: {
      id,
      status: 'active',
      isActive: true,
      name: typed.name as string,
      category: typed.category as string,
      city: (typed.city ?? null) as string | null,
      latitude: hasLatitude ? typed.latitude as number : null,
      longitude: hasLongitude ? typed.longitude as number : null,
      rating: typed.google_rating === undefined ? null : typed.google_rating as number | null,
      openNow,
      accessibility: typed.is_accessible === true ? 'VERIFIED_ACCESSIBLE' : 'UNKNOWN',
      services: [],
      equipment: [],
      officialCommitments: commitments,
    },
  };
}

function toCandidate(record: SourceMerchantRecord, origin?: YootChatReadFilters['origin']): MerchantCandidate | SourceMerchantQuarantine {
  let distanceKm: number | null = null;
  if (origin) {
    if (record.latitude === null || record.longitude === null) return { id: record.id, reason: 'INVALID_COORDINATES' };
    distanceKm = haversineKm(origin, { latitude: record.latitude, longitude: record.longitude });
    if (origin.radiusKm !== undefined && distanceKm > origin.radiusKm) return { id: record.id, reason: 'INVALID_COORDINATES' };
  }

  return {
    id: record.id,
    status: 'active',
    distanceKm,
    facts: {
      name: record.name,
      category: record.category,
      city: record.city,
      openNow: record.openNow,
      rating: record.rating,
      accessibility: record.accessibility,
      services: record.services,
      equipment: record.equipment,
      officialCommitments: record.officialCommitments,
    },
  };
}

const isQuarantine = (value: MerchantCandidate | SourceMerchantQuarantine): value is SourceMerchantQuarantine =>
  'reason' in value;

const classifyQueryError = (error: SupabaseQueryError): YootChatSupabaseErrorCode => {
  if (error.name === 'AbortError' || error.code === 'ABORT_ERR') return 'SUPABASE_TIMEOUT';
  if (error.code === '42501' || /rls|permission denied/i.test(error.message ?? '')) return 'SUPABASE_RLS_DENIED';
  return 'SUPABASE_NETWORK_ERROR';
};

function applyFilters(builder: ReadOnlyPostgrestBuilder, filters: YootChatReadFilters | undefined, limit: number) {
  let query = builder
    .eq('status', 'active')
    .eq('is_active', true)
    .limit(limit);

  if (query.order) query = query.order('id', { ascending: true });
  if (filters?.city) query = query.eq('city', filters.city);
  if (filters?.categoryIds?.length && query.in) query = query.in('category', filters.categoryIds);
  if (filters?.allowedMerchantIds?.length && query.in) query = query.in('id', filters.allowedMerchantIds);
  if (filters?.origin && query.gte && query.lte) {
    const radius = filters.origin.radiusKm ?? 10;
    const latDelta = radius / 111;
    const lonDelta = radius / Math.max(20, 111 * Math.cos((filters.origin.latitude * Math.PI) / 180));
    query = query.gte('latitude', filters.origin.latitude - latDelta);
    query = query.lte?.('latitude', filters.origin.latitude + latDelta) ?? query;
    query = query.gte?.('longitude', filters.origin.longitude - lonDelta) ?? query;
    query = query.lte?.('longitude', filters.origin.longitude + lonDelta) ?? query;
  }
  return query;
}

export function createYootChatSupabaseReadAdapter(options: YootChatSupabaseReadAdapterOptions): YootChatMerchantReadPort {
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? YOOTCHAT_SUPABASE_TIMEOUT_MS;
  const createAbortSignal = options.createAbortSignal ?? createDefaultAbortSignal;

  return {
    async read(request?: YootChatReadRequest): Promise<YootChatReadResult> {
      const started = now();
      const limit = safeLimit(request?.filters?.limit);
      const emptyBucket = durationBucket(now() - started);
      if (limit === null) {
        const failure = fallbackFailure('LIMIT_OUT_OF_RANGE', [], 0, 0, emptyBucket);
        emit(options.observer, { code: 'YOOTCHAT_SUPABASE_FALLBACK', errorCode: failure.code, durationBucketMs: failure.durationBucketMs });
        return failure;
      }
      const filterError = validateFilters(request?.filters);
      if (filterError) {
        const failure = fallbackFailure(filterError, [], 0, 0, emptyBucket);
        emit(options.observer, { code: 'YOOTCHAT_SUPABASE_FALLBACK', errorCode: failure.code, durationBucketMs: failure.durationBucketMs });
        return failure;
      }

      emit(options.observer, { code: 'YOOTCHAT_SUPABASE_READ_START' });

      let response: SupabaseQueryResponse;
      try {
        let query = options.client
          .from(YOOTCHAT_SUPABASE_TABLE)
          .select(YOOTCHAT_SUPABASE_MERCHANT_SELECT);
        query = applyFilters(query, request?.filters, limit);
        if (query.abortSignal) query = query.abortSignal(createAbortSignal(timeoutMs));
        response = await query;
      } catch (error) {
        const errorCode = classifyQueryError(error as SupabaseQueryError);
        const bucket = durationBucket(now() - started);
        const failure = fallbackFailure(errorCode, [], 0, 0, bucket);
        emit(options.observer, {
          code: errorCode === 'SUPABASE_TIMEOUT' ? 'YOOTCHAT_SUPABASE_READ_TIMEOUT' : 'YOOTCHAT_SUPABASE_READ_NETWORK_ERROR',
          errorCode,
          durationBucketMs: bucket,
        });
        emit(options.observer, { code: 'YOOTCHAT_SUPABASE_FALLBACK', errorCode, durationBucketMs: bucket });
        return failure;
      }

      const bucket = durationBucket(now() - started);
      if (response.error) {
        const errorCode = classifyQueryError(response.error);
        const failure = fallbackFailure(errorCode, [], 0, 0, bucket);
        emit(options.observer, {
          code: errorCode === 'SUPABASE_RLS_DENIED' ? 'YOOTCHAT_SUPABASE_READ_RLS_ERROR' : 'YOOTCHAT_SUPABASE_READ_NETWORK_ERROR',
          errorCode,
          durationBucketMs: bucket,
        });
        emit(options.observer, { code: 'YOOTCHAT_SUPABASE_FALLBACK', errorCode, durationBucketMs: bucket });
        return failure;
      }

      if (!Array.isArray(response.data)) {
        const failure = fallbackFailure('MALFORMED_RESPONSE', [], 0, 0, bucket);
        emit(options.observer, { code: 'YOOTCHAT_SUPABASE_SCHEMA_ERROR', errorCode: failure.code, durationBucketMs: bucket });
        emit(options.observer, { code: 'YOOTCHAT_SUPABASE_FALLBACK', errorCode: failure.code, durationBucketMs: bucket });
        return failure;
      }

      const projected = response.data.map(projectRow);
      const records = projected.flatMap((item) => (item.ok ? [item.value] : []));
      const quarantined: SourceMerchantQuarantine[] = projected.flatMap((item) => (item.ok ? [] : [item.quarantine]));

      const seen = new Set<string>();
      const uniqueRecords: SourceMerchantRecord[] = [];
      for (const record of records) {
        if (seen.has(record.id)) {
          quarantined.push({ id: record.id, reason: 'DUPLICATE_ID' });
        } else {
          seen.add(record.id);
          uniqueRecords.push(record);
        }
      }

      const candidatesOrQuarantine = uniqueRecords.map((record) => toCandidate(record, request?.filters?.origin));
      const candidates = candidatesOrQuarantine.filter((item): item is MerchantCandidate => !isQuarantine(item));
      quarantined.push(...candidatesOrQuarantine.filter(isQuarantine));

      for (const item of quarantined) {
        emit(options.observer, { code: 'YOOTCHAT_SUPABASE_ROW_QUARANTINED', reason: item.reason });
      }

      const rowCount = response.data.length;
      const invalidRatio = rowCount === 0 ? 0 : quarantined.length / rowCount;
      if (rowCount === 0) {
        const failure = fallbackFailure('NO_ACTIVE_ROWS', quarantined, rowCount, candidates.length, bucket);
        emit(options.observer, { code: 'YOOTCHAT_SUPABASE_FALLBACK', errorCode: failure.code, rowCount, acceptedCount: 0, quarantinedCount: quarantined.length, durationBucketMs: bucket });
        return failure;
      }
      if (invalidRatio > YOOTCHAT_SUPABASE_MAX_QUARANTINE_RATIO) {
        const failure = fallbackFailure('TOO_MANY_INVALID_ROWS', quarantined, rowCount, candidates.length, bucket);
        emit(options.observer, { code: 'YOOTCHAT_SUPABASE_FALLBACK', errorCode: failure.code, rowCount, acceptedCount: candidates.length, quarantinedCount: quarantined.length, durationBucketMs: bucket });
        return failure;
      }
      if (candidates.length === 0) {
        const failure = fallbackFailure('NO_MATCHING_CANDIDATES', quarantined, rowCount, 0, bucket);
        emit(options.observer, { code: 'YOOTCHAT_SUPABASE_FALLBACK', errorCode: failure.code, rowCount, acceptedCount: 0, quarantinedCount: quarantined.length, durationBucketMs: bucket });
        return failure;
      }

      emit(options.observer, {
        code: 'YOOTCHAT_SUPABASE_READ_SUCCESS',
        rowCount,
        acceptedCount: candidates.length,
        quarantinedCount: quarantined.length,
        durationBucketMs: bucket,
      });

      return {
        ok: true,
        records: uniqueRecords.filter((record) => candidates.some((candidate) => candidate.id === record.id)),
        candidates,
        quarantined,
        rowCount,
        acceptedCount: candidates.length,
        durationBucketMs: bucket,
      };
    },
  };
}
