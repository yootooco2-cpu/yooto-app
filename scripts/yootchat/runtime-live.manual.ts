import { createClient } from '@supabase/supabase-js';
import { resolveYootChatPublicSupabaseKey, type ReadOnlySupabaseClient } from '../../src/features/yootchat';
import {
  createOfflineSupabaseClient,
  futureLiveHarnessRequest,
  runYootChatRuntimeHarness,
  type YootChatRuntimeHarnessResult,
} from './runtimeLiveHarness';

export type RuntimeManualMode = 'DRY_RUN' | 'LIVE';

export type TransportFirstOutcome = 'HTTP_RESPONSE' | 'TYPE_ERROR' | 'ABORTED' | 'OTHER_ERROR' | 'NONE';
export type TransportHttpStatusClass = 'HTTP_2XX' | 'HTTP_4XX' | 'HTTP_5XX' | 'HTTP_OTHER' | 'NONE';

export interface SafeTransportObservation {
  readonly logicalCallCount: number;
  readonly physicalCallCount: number;
  readonly retryBlocked: boolean;
  readonly firstOutcome: TransportFirstOutcome;
  readonly firstHttpStatus: number | null;
  readonly firstHttpStatusClass: TransportHttpStatusClass;
}

export type RuntimeManualConfigResult =
  | {
      readonly ok: true;
      readonly mode: RuntimeManualMode;
      readonly clientKind: 'OFFLINE' | 'SUPABASE';
    }
  | {
      readonly ok: false;
      readonly reason:
        | 'MODE_MISSING'
        | 'MODE_UNKNOWN'
        | 'LIVE_CONFIRMATION_MISSING'
        | 'URL_MISSING'
        | 'URL_INVALID'
        | 'KEY_MISSING'
        | 'KEY_FORBIDDEN'
        | 'KEY_UNKNOWN';
    };

const cleanEnvValue = (value: string | undefined) => value?.trim().replace(/^['"]|['"]$/g, '') ?? '';

const createSupabaseReadOnlyClient = createClient as unknown as (
  url: string,
  key: string,
  options: Record<string, unknown>,
) => ReadOnlySupabaseClient;

export interface SinglePhysicalFetchGuard {
  readonly fetch: typeof fetch;
  readonly getLogicalCallCount: () => number;
  readonly getPhysicalCallCount: () => number;
  readonly getObservation: () => SafeTransportObservation;
}

const statusClass = (status: number | null): TransportHttpStatusClass => {
  if (status === null) return 'NONE';
  if (status >= 200 && status <= 299) return 'HTTP_2XX';
  if (status >= 400 && status <= 499) return 'HTTP_4XX';
  if (status >= 500 && status <= 599) return 'HTTP_5XX';
  return 'HTTP_OTHER';
};

const errorOutcome = (error: unknown, signal: AbortSignal | null): TransportFirstOutcome => {
  if (signal?.aborted) return 'ABORTED';
  if (typeof error === 'object' && error !== null) {
    const maybe = error as { readonly name?: unknown; readonly code?: unknown };
    if (maybe.name === 'AbortError' || maybe.code === 'ABORT_ERR') return 'ABORTED';
  }
  if (error instanceof TypeError) return 'TYPE_ERROR';
  return 'OTHER_ERROR';
};

export function createSinglePhysicalFetchGuard(transport: typeof fetch = fetch): SinglePhysicalFetchGuard {
  let logicalCallCount = 0;
  let physicalCallCount = 0;
  let retryBlocked = false;
  let firstOutcome: TransportFirstOutcome = 'NONE';
  let firstHttpStatus: number | null = null;

  return {
    async fetch(input, init) {
      logicalCallCount += 1;
      if (logicalCallCount > 1) {
        retryBlocked = true;
        return new Response(JSON.stringify({ code: 'YOOTCHAT_RETRY_BLOCKED' }), {
          status: 599,
          headers: { 'content-type': 'application/json' },
        });
      }
      physicalCallCount += 1;
      try {
        const response = await transport(input, init);
        firstOutcome = 'HTTP_RESPONSE';
        firstHttpStatus = response.status;
        return response;
      } catch (error) {
        firstOutcome = errorOutcome(error, init?.signal ?? (input instanceof Request ? input.signal : null));
        throw error;
      }
    },
    getLogicalCallCount: () => logicalCallCount,
    getPhysicalCallCount: () => physicalCallCount,
    getObservation: () => ({
      logicalCallCount,
      physicalCallCount,
      retryBlocked,
      firstOutcome,
      firstHttpStatus,
      firstHttpStatusClass: statusClass(firstHttpStatus),
    }),
  };
}

const isValidSupabaseUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
};

export function createRuntimeManualRequest(mode: RuntimeManualMode) {
  return mode === 'LIVE' ? futureLiveHarnessRequest : undefined;
}

export function prepareRuntimeManualConfig(env: NodeJS.ProcessEnv): RuntimeManualConfigResult {
  const mode = cleanEnvValue(env.YOOTCHAT_RUNTIME_MODE);
  if (!mode) return { ok: false, reason: 'MODE_MISSING' };
  if (mode !== 'DRY_RUN' && mode !== 'LIVE') return { ok: false, reason: 'MODE_UNKNOWN' };
  if (mode === 'DRY_RUN') return { ok: true, mode, clientKind: 'OFFLINE' };

  if (cleanEnvValue(env.YOOTCHAT_LIVE_CONFIRM) !== 'YES') return { ok: false, reason: 'LIVE_CONFIRMATION_MISSING' };

  const url = cleanEnvValue(env.EXPO_PUBLIC_SUPABASE_URL);
  if (!url) return { ok: false, reason: 'URL_MISSING' };
  if (!isValidSupabaseUrl(url)) return { ok: false, reason: 'URL_INVALID' };

  const publishable = cleanEnvValue(env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (!publishable) return { ok: false, reason: 'KEY_MISSING' };
  if (publishable.startsWith('sb_secret_') || /service_role/i.test(publishable)) return { ok: false, reason: 'KEY_FORBIDDEN' };
  if (!publishable.startsWith('sb_publishable_')) return { ok: false, reason: 'KEY_UNKNOWN' };
  return { ok: true, mode, clientKind: 'SUPABASE' };
}

export async function runRuntimeManualHarness(
  env: NodeJS.ProcessEnv,
  writeLine: (line: string) => void = console.log,
): Promise<YootChatRuntimeHarnessResult | RuntimeManualConfigResult> {
  writeLine(JSON.stringify({ stage: 'HARNESS_PRECHECK_START' }));
  const config = prepareRuntimeManualConfig(env);
  if (!config.ok) {
    writeLine(JSON.stringify({ stage: 'HARNESS_BLOCKED' }));
    return config;
  }
  writeLine(JSON.stringify({ stage: 'HARNESS_PRECHECK_OK' }));

  let createHarnessClient: () => ReadOnlySupabaseClient;
  let transportGuard: SinglePhysicalFetchGuard | null = null;
  if (config.mode === 'DRY_RUN') {
    createHarnessClient = () => createOfflineSupabaseClient('SUCCESS');
  } else {
    const url = cleanEnvValue(env.EXPO_PUBLIC_SUPABASE_URL);
    const resolved = resolveYootChatPublicSupabaseKey({
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });
    if (!resolved.ok) {
      writeLine(JSON.stringify({ terminalStage: 'HARNESS_BLOCKED', reason: 'KEY_UNKNOWN' }));
      return { ok: false, reason: 'KEY_UNKNOWN' };
    }
    const guard = createSinglePhysicalFetchGuard();
    transportGuard = guard;
    createHarnessClient = () => createSupabaseReadOnlyClient(url, resolved.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: guard.fetch,
        headers: {
          Accept: 'application/json',
          'Accept-Profile': 'public',
        },
      },
    }) as ReadOnlySupabaseClient;
  }

  const result = await runYootChatRuntimeHarness({
    createClient: createHarnessClient,
    request: createRuntimeManualRequest(config.mode),
    harnessTimeoutMs: 3_000,
    onStage: (stage) => writeLine(JSON.stringify({ stage })),
    skipPrecheckStages: true,
  });
  writeLine(JSON.stringify({ aggregate: result.aggregate }));
  const guardedTransport = transportGuard;
  if (guardedTransport !== null) writeLine(JSON.stringify({ transport: guardedTransport.getObservation() }));
  return result;
}

if (process.env.YOOTCHAT_MANUAL_JEST_ENTRY === '1') {
  describe('YootChat runtime live manual harness entry', () => {
    test('executes the selected guarded mode', async () => {
      const result = await runRuntimeManualHarness(process.env);
      if ('stages' in result) expect(result.aggregate.terminalStage).toBe('HARNESS_COMPLETED');
      else expect(result.ok).toBe(false);
    });
  });
}
