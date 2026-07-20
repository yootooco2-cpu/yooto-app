import { createClient } from '@supabase/supabase-js';
import { YOOTCHAT_SUPABASE_MERCHANT_SELECT, type ReadOnlySupabaseClient } from '../../src/features/yootchat';
import {
  createOfflineSupabaseClient,
  futureLiveHarnessRequest,
  runYootChatRuntimeHarness,
  type YootChatRuntimeHarnessResult,
} from './runtimeLiveHarness';
import {
  createSinglePhysicalFetchGuard,
  type SafeTransportObservation,
  type SinglePhysicalFetchGuard,
} from './runtime-live.manual';

type DiagnosticScenario =
  | 'HTTP_200_MINIMAL'
  | 'HTTP_401_KEY_REFUSED'
  | 'HTTP_401_JWT'
  | 'HTTP_403_42501'
  | 'HTTP_400_SCHEMA'
  | 'HTTP_UNKNOWN'
  | 'NETWORK_TYPE_ERROR'
  | 'ABORT_TIMEOUT';

type AuthorizationHeaderType = 'NONE' | 'PUBLISHABLE' | 'LEGACY_JWT' | 'OTHER';

interface RecordedRequest {
  readonly method: string;
  readonly pathname: string;
  readonly searchParams: URLSearchParams;
  readonly headers: Headers;
  readonly signalPresent: boolean;
}

const fakeProjectRef = 'transport-diagnostic-project';
const fakeSupabaseUrl = `https://${fakeProjectRef}.supabase.co`;
const fakePublishableKey = ['sb', 'publishable', 'transport_diagnostic_key'].join('_');

const compatibleRows = [
  {
    id: 1,
    name: 'Diagnostic Merchant',
    status: 'active',
    is_active: true,
    city: 'Diagnostic City',
    latitude: null,
    longitude: null,
    google_rating: 4,
    category: 'Diagnostic Category',
    opening_hours: { open_now: true },
    est_ess: false,
    est_bio: false,
    artisan_rm: false,
    est_societe_mission: false,
  },
];

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const mergedHeaders = (input: RequestInfo | URL, init?: RequestInit) => {
  const headers = new Headers(input instanceof Request ? input.headers : undefined);
  new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
  return headers;
};

const inputUrl = (input: RequestInfo | URL) => {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
};

const inputMethod = (input: RequestInfo | URL, init?: RequestInit) => {
  if (init?.method) return init.method;
  if (input instanceof Request) return input.method;
  return 'GET';
};

const inputSignal = (input: RequestInfo | URL, init?: RequestInit) => {
  if (init?.signal) return init.signal;
  if (input instanceof Request) return input.signal;
  return null;
};

function createDiagnosticFetch(scenario: DiagnosticScenario) {
  const requests: RecordedRequest[] = [];

  const fakeFetch: typeof fetch = async (input, init) => {
    const url = new URL(inputUrl(input));
    const headers = mergedHeaders(input, init);
    const signal = inputSignal(input, init);
    requests.push({
      method: inputMethod(input, init),
      pathname: url.pathname,
      searchParams: url.searchParams,
      headers,
      signalPresent: signal !== null,
    });

    if (url.origin !== fakeSupabaseUrl) throw new TypeError('blocked external transport');

    if (scenario === 'NETWORK_TYPE_ERROR') throw new TypeError('simulated transport failure');
    if (scenario === 'ABORT_TIMEOUT') {
      await new Promise<never>((_resolve, reject) => {
        const abort = () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        if (signal?.aborted) {
          abort();
          return;
        }
        signal?.addEventListener('abort', abort, { once: true });
      });
    }

    if (scenario === 'HTTP_200_MINIMAL') return jsonResponse(200, compatibleRows);
    if (scenario === 'HTTP_401_KEY_REFUSED') return jsonResponse(401, { message: 'invalid api key' });
    if (scenario === 'HTTP_401_JWT') return jsonResponse(401, { code: 'PGRST301', message: 'JWT invalid' });
    if (scenario === 'HTTP_403_42501') return jsonResponse(403, { code: '42501', message: 'permission denied' });
    if (scenario === 'HTTP_UNKNOWN') return jsonResponse(418, { code: 'PGRST999', message: 'unknown supabase failure' });
    return jsonResponse(400, { code: '42703', message: 'column not found' });
  };

  return { fakeFetch, requests };
}

const authorizationType = (headers: Headers): AuthorizationHeaderType => {
  const value = headers.get('authorization');
  if (!value) return 'NONE';
  if (value === `Bearer ${fakePublishableKey}`) return 'PUBLISHABLE';
  const token = value.startsWith('Bearer ') ? value.slice('Bearer '.length) : value;
  if (token.split('.').length === 3 && token.startsWith('eyJ')) return 'LEGACY_JWT';
  return 'OTHER';
};

const createSdkClient = (fakeFetch: typeof fetch) => createClient(fakeSupabaseUrl, fakePublishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: {
    fetch: fakeFetch,
    headers: {
      Accept: 'application/json',
      'Accept-Profile': 'public',
    },
  },
}) as unknown as ReadOnlySupabaseClient;

async function runScenario(scenario: DiagnosticScenario): Promise<{
  readonly result: YootChatRuntimeHarnessResult;
  readonly requests: readonly RecordedRequest[];
  readonly logicalCallCount: number;
  readonly physicalCallCount: number;
  readonly transport: SafeTransportObservation;
}> {
  const diagnostic = createDiagnosticFetch(scenario);
  const guard = createSinglePhysicalFetchGuard(diagnostic.fakeFetch);
  const result = await runYootChatRuntimeHarness({
    client: createSdkClient(guard.fetch),
    request: futureLiveHarnessRequest,
    adapterTimeoutMs: scenario === 'ABORT_TIMEOUT' ? 20 : 2_000,
    harnessTimeoutMs: scenario === 'NETWORK_TYPE_ERROR' ? 2_500 : 500,
  });
  return {
    result,
    requests: diagnostic.requests,
    logicalCallCount: guard.getLogicalCallCount(),
    physicalCallCount: guard.getPhysicalCallCount(),
    transport: guard.getObservation(),
  };
}

async function runDirectScenario(scenario: 'NETWORK_TYPE_ERROR'): Promise<{
  readonly result: YootChatRuntimeHarnessResult;
  readonly logicalCallCount: number;
  readonly physicalCallCount: number;
}> {
  const result = await runYootChatRuntimeHarness({
    client: createOfflineSupabaseClient(scenario === 'NETWORK_TYPE_ERROR' ? 'NETWORK_ERROR' : 'SUCCESS'),
    request: futureLiveHarnessRequest,
    harnessTimeoutMs: 500,
  });
  return { result, logicalCallCount: 1, physicalCallCount: 0 };
}

describe('YootChat Supabase transport offline diagnostic Lot 5B-I', () => {
  test('constructs exactly one bounded merchants request through supabase-js', async () => {
    const { result, requests, logicalCallCount, physicalCallCount, transport } = await runScenario('HTTP_200_MINIMAL');
    const request = requests[0];

    expect(requests).toHaveLength(1);
    expect(result.aggregate.requestCount).toBe(1);
    expect(logicalCallCount).toBe(1);
    expect(physicalCallCount).toBe(1);
    expect(transport).toEqual({
      logicalCallCount: 1,
      physicalCallCount: 1,
      retryBlocked: false,
      firstOutcome: 'HTTP_RESPONSE',
      firstHttpStatus: 200,
      firstHttpStatusClass: 'HTTP_2XX',
    });
    expect(request.method).toBe('GET');
    expect(request.pathname).toBe('/rest/v1/merchants');
    expect(request.headers.has('apikey')).toBe(true);
    expect(authorizationType(request.headers)).toBe('PUBLISHABLE');
    expect(request.headers.get('accept')).toBe('application/json');
    expect(request.headers.get('accept-profile')).toBe('public');
    expect(request.searchParams.get('select')).toBe(YOOTCHAT_SUPABASE_MERCHANT_SELECT);
    expect(request.searchParams.get('select')).not.toContain('*');
    expect(request.searchParams.get('status')).toBe('eq.active');
    expect(request.searchParams.get('is_active')).toBe('eq.true');
    expect(request.searchParams.get('order')).toBe('id.asc');
    expect(request.searchParams.get('limit')).toBe('5');
    expect(request.signalPresent).toBe(true);
    expect(result.aggregate.terminalStage).toBe('HARNESS_COMPLETED');
    expect(result.aggregate.readOk).toBe(true);
  });

  test.each([
    ['HTTP_401_KEY_REFUSED', 401, 'HTTP_4XX', 'SUPABASE_AUTH_REJECTED', 'SERVICE_UNAVAILABLE'],
    ['HTTP_401_JWT', 401, 'HTTP_4XX', 'SUPABASE_AUTH_REJECTED', 'SERVICE_UNAVAILABLE'],
    ['HTTP_403_42501', 403, 'HTTP_4XX', 'SUPABASE_RLS_DENIED', 'SERVICE_UNAVAILABLE'],
    ['HTTP_400_SCHEMA', 400, 'HTTP_4XX', 'SCHEMA_INCOMPATIBLE', 'SERVICE_UNAVAILABLE'],
    ['HTTP_UNKNOWN', 418, 'HTTP_4XX', 'SUPABASE_UNAVAILABLE', 'SERVICE_UNAVAILABLE'],
  ] as const)('normalizes synthetic %s without retry', async (scenario, status, statusClassValue, adapterCategory, fallback) => {
    const { result, requests, logicalCallCount, physicalCallCount, transport } = await runScenario(scenario);

    expect(requests).toHaveLength(1);
    expect(result.aggregate.requestCount).toBe(1);
    expect(logicalCallCount).toBe(1);
    expect(physicalCallCount).toBe(1);
    expect(transport).toEqual({
      logicalCallCount: 1,
      physicalCallCount: 1,
      retryBlocked: false,
      firstOutcome: 'HTTP_RESPONSE',
      firstHttpStatus: status,
      firstHttpStatusClass: statusClassValue,
    });
    expect(result.aggregate.readOk).toBe(false);
    expect(result.aggregate.readErrorCode).toBe(adapterCategory);
    expect(result.aggregate.messageTemplate).toBe(fallback);
    expect(result.aggregate.terminalStage).toBe('HARNESS_COMPLETED');
  });

  test('normalizes SDK status 0 with an interrupted signal as timeout', async () => {
    const { result, requests, logicalCallCount, physicalCallCount, transport } = await runScenario('ABORT_TIMEOUT');

    expect(requests).toHaveLength(1);
    expect(result.aggregate.requestCount).toBe(1);
    expect(logicalCallCount).toBe(1);
    expect(physicalCallCount).toBe(1);
    expect(transport).toEqual({
      logicalCallCount: 1,
      physicalCallCount: 1,
      retryBlocked: false,
      firstOutcome: 'ABORTED',
      firstHttpStatus: null,
      firstHttpStatusClass: 'NONE',
    });
    expect(result.aggregate.readOk).toBe(false);
    expect(result.aggregate.readErrorCode).toBe('SUPABASE_TIMEOUT');
    expect(result.aggregate.messageTemplate).toBe('SERVICE_UNAVAILABLE');
    expect(result.aggregate.terminalStage).toBe('HARNESS_COMPLETED');
  });

  test('normalizes a direct TypeError transport failure as network without physical transport', async () => {
    const { result, logicalCallCount, physicalCallCount } = await runDirectScenario('NETWORK_TYPE_ERROR');

    expect(result.aggregate.requestCount).toBe(1);
    expect(logicalCallCount).toBe(1);
    expect(physicalCallCount).toBe(0);
    expect(result.aggregate.readOk).toBe(false);
    expect(result.aggregate.readErrorCode).toBe('SUPABASE_NETWORK_ERROR');
    expect(result.aggregate.messageTemplate).toBe('SERVICE_UNAVAILABLE');
    expect(result.aggregate.terminalStage).toBe('HARNESS_COMPLETED');
  });

  test('single-physical-call guard blocks an internal SDK retry locally', async () => {
    const { result, requests, logicalCallCount, physicalCallCount, transport } = await runScenario('NETWORK_TYPE_ERROR');

    expect(requests).toHaveLength(1);
    expect(result.aggregate.requestCount).toBe(1);
    expect(logicalCallCount).toBe(2);
    expect(physicalCallCount).toBe(1);
    expect(transport).toEqual({
      logicalCallCount: 2,
      physicalCallCount: 1,
      retryBlocked: true,
      firstOutcome: 'TYPE_ERROR',
      firstHttpStatus: null,
      firstHttpStatusClass: 'NONE',
    });
    expect(result.aggregate.readOk).toBe(false);
    expect(result.aggregate.readErrorCode).toBe('SUPABASE_RETRY_BLOCKED');
    expect(result.aggregate.messageTemplate).toBe('SERVICE_UNAVAILABLE');
    expect(result.aggregate.terminalStage).toBe('HARNESS_COMPLETED');
  });

  test('keeps guarded retry counters bounded without leaking request details', async () => {
    const guard: SinglePhysicalFetchGuard = createSinglePhysicalFetchGuard(async () => {
      throw new TypeError('first transport failure');
    });

    await expect(guard.fetch(fakeSupabaseUrl)).rejects.toBeInstanceOf(TypeError);
    const blocked = await guard.fetch(fakeSupabaseUrl);

    expect(blocked.status).toBe(599);
    expect(guard.getLogicalCallCount()).toBe(2);
    expect(guard.getPhysicalCallCount()).toBe(1);
    expect(guard.getObservation()).toEqual({
      logicalCallCount: 2,
      physicalCallCount: 1,
      retryBlocked: true,
      firstOutcome: 'TYPE_ERROR',
      firstHttpStatus: null,
      firstHttpStatusClass: 'NONE',
    });
  });
});
