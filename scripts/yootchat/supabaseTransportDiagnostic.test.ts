import { createClient } from '@supabase/supabase-js';
import { YOOTCHAT_SUPABASE_MERCHANT_SELECT, type ReadOnlySupabaseClient } from '../../src/features/yootchat';
import {
  futureLiveHarnessRequest,
  runYootChatRuntimeHarness,
  type YootChatRuntimeHarnessResult,
} from './runtimeLiveHarness';

type DiagnosticScenario =
  | 'HTTP_200_MINIMAL'
  | 'HTTP_401_KEY_REFUSED'
  | 'HTTP_401_JWT'
  | 'HTTP_403_42501'
  | 'HTTP_400_SCHEMA'
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
}> {
  const diagnostic = createDiagnosticFetch(scenario);
  const result = await runYootChatRuntimeHarness({
    client: createSdkClient(diagnostic.fakeFetch),
    request: futureLiveHarnessRequest,
    adapterTimeoutMs: scenario === 'ABORT_TIMEOUT' ? 20 : 1_500,
    harnessTimeoutMs: 500,
  });
  return { result, requests: diagnostic.requests };
}

describe('YootChat Supabase transport offline diagnostic Lot 5B-F', () => {
  test('constructs exactly one bounded merchants request through supabase-js', async () => {
    const { result, requests } = await runScenario('HTTP_200_MINIMAL');
    const request = requests[0];

    expect(requests).toHaveLength(1);
    expect(result.aggregate.requestCount).toBe(1);
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
    ['HTTP_401_KEY_REFUSED', 401, 'SUPABASE_NETWORK_ERROR', 'SERVICE_UNAVAILABLE'],
    ['HTTP_401_JWT', 401, 'SUPABASE_NETWORK_ERROR', 'SERVICE_UNAVAILABLE'],
    ['HTTP_403_42501', 403, 'SUPABASE_RLS_DENIED', 'SERVICE_UNAVAILABLE'],
    ['HTTP_400_SCHEMA', 400, 'SUPABASE_NETWORK_ERROR', 'SERVICE_UNAVAILABLE'],
    ['ABORT_TIMEOUT', null, 'SUPABASE_NETWORK_ERROR', 'SERVICE_UNAVAILABLE'],
  ] as const)('normalizes synthetic %s without retry', async (scenario, _status, adapterCategory, fallback) => {
    const { result, requests } = await runScenario(scenario);

    expect(requests).toHaveLength(1);
    expect(result.aggregate.requestCount).toBe(1);
    expect(result.aggregate.readOk).toBe(false);
    expect(result.aggregate.readErrorCode).toBe(adapterCategory);
    expect(result.aggregate.messageTemplate).toBe(fallback);
    expect(result.aggregate.terminalStage).toBe('HARNESS_COMPLETED');
  });

  test('network TypeError enters the SDK retry window and is cut by the harness timeout', async () => {
    const { result, requests } = await runScenario('NETWORK_TYPE_ERROR');

    expect(requests).toHaveLength(1);
    expect(result.aggregate.requestCount).toBe(1);
    expect(result.aggregate.readOk).toBe(false);
    expect(result.aggregate.readErrorCode).toBe('HARNESS_TIMEOUT');
    expect(result.aggregate.terminalStage).toBe('HARNESS_TIMEOUT');
  });

  test('proves the current classifier gap for non-42501 PostgREST errors and SDK aborts', async () => {
    const keyRefused = await runScenario('HTTP_401_KEY_REFUSED');
    const jwtRejected = await runScenario('HTTP_401_JWT');
    const schemaRejected = await runScenario('HTTP_400_SCHEMA');
    const sdkAbort = await runScenario('ABORT_TIMEOUT');

    expect(keyRefused.result.aggregate.readErrorCode).toBe('SUPABASE_NETWORK_ERROR');
    expect(jwtRejected.result.aggregate.readErrorCode).toBe('SUPABASE_NETWORK_ERROR');
    expect(schemaRejected.result.aggregate.readErrorCode).toBe('SUPABASE_NETWORK_ERROR');
    expect(sdkAbort.result.aggregate.readErrorCode).toBe('SUPABASE_NETWORK_ERROR');
    expect(keyRefused.result.aggregate.readErrorCode).toBe(schemaRejected.result.aggregate.readErrorCode);
  });
});
