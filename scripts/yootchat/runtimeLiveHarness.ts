import type { YootChatRequest } from '../../src/features/yootchat/contracts';
import {
  createYootChatRuntime,
  YOOTCHAT_SUPABASE_MERCHANT_SELECT,
  type ReadOnlySupabaseClient,
  type YootChatReadFilters,
  type YootChatReadObservation,
} from '../../src/features/yootchat';

export const YOOTCHAT_RUNTIME_HARNESS_STAGES = [
  'HARNESS_PRECHECK_START',
  'HARNESS_PRECHECK_OK',
  'HARNESS_CLIENT_READY',
  'HARNESS_RUNTIME_READY',
  'HARNESS_EXECUTE_START',
  'HARNESS_READ_STARTED',
  'HARNESS_READ_SETTLED',
  'HARNESS_ENGINE_SETTLED',
  'HARNESS_AGGREGATE_READY',
  'HARNESS_COMPLETED',
  'HARNESS_TIMEOUT',
  'HARNESS_BLOCKED',
] as const;

export type YootChatRuntimeHarnessStage = (typeof YOOTCHAT_RUNTIME_HARNESS_STAGES)[number];

export interface YootChatRuntimeHarnessAggregate {
  readonly requestCount: number;
  readonly readOk: boolean;
  readonly readErrorCode: string | null;
  readonly rowCount: number;
  readonly acceptedCount: number;
  readonly quarantinedCount: number;
  readonly quarantineReasonCounts: Readonly<Record<string, number>>;
  readonly engineOk: boolean;
  readonly topic: string | null;
  readonly messageTemplate: string | null;
  readonly recommendationCount: number;
  readonly limitationCodes: readonly string[];
  readonly interfaceActionCount: number;
  readonly durationBucketMs: string | null;
  readonly terminalStage: YootChatRuntimeHarnessStage;
}

export interface YootChatRuntimeHarnessResult {
  readonly stages: readonly YootChatRuntimeHarnessStage[];
  readonly aggregate: YootChatRuntimeHarnessAggregate;
  readonly adapterEventCounts: Readonly<Record<string, number>>;
}

export interface YootChatRuntimeHarnessOptions {
  readonly client?: ReadOnlySupabaseClient;
  readonly createClient?: () => ReadOnlySupabaseClient;
  readonly request?: YootChatRequest;
  readonly filters?: YootChatReadFilters;
  readonly adapterTimeoutMs?: number;
  readonly harnessTimeoutMs?: number;
  readonly now?: () => number;
  readonly createAbortSignal?: (timeoutMs: number) => AbortSignal;
  readonly onStage?: (stage: YootChatRuntimeHarnessStage) => void;
  readonly skipPrecheckStages?: boolean;
}

export type OfflineScenario =
  | 'SUCCESS'
  | 'RLS_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'HANG'
  | 'MALFORMED_RESPONSE'
  | 'PARTIAL_QUARANTINE'
  | 'ENGINE_UNCERTIFIABLE';

export type RecordedOperation = readonly [string, ...unknown[]];

interface QueryResponse {
  readonly data: unknown;
  readonly error: null | {
    readonly code?: string;
    readonly message?: string;
    readonly name?: string;
  };
}

interface OfflineClient extends ReadOnlySupabaseClient {
  readonly operations: readonly RecordedOperation[];
}

const DEFAULT_HARNESS_TIMEOUT_MS = 3_000;

export const dryRunHarnessRequest: YootChatRequest = {
  message: 'Find local test merchants',
  language: 'en',
  city: 'Harness City',
};

export const futureLiveHarnessRequest: YootChatRequest = {
  message: 'Trouve-moi des commerces locaux',
  language: 'fr',
};

const emptyAggregate = (terminalStage: YootChatRuntimeHarnessStage, readErrorCode: string | null): YootChatRuntimeHarnessAggregate => ({
  requestCount: 0,
  readOk: false,
  readErrorCode,
  rowCount: 0,
  acceptedCount: 0,
  quarantinedCount: 0,
  quarantineReasonCounts: {},
  engineOk: false,
  topic: null,
  messageTemplate: null,
  recommendationCount: 0,
  limitationCodes: [],
  interfaceActionCount: 0,
  durationBucketMs: null,
  terminalStage,
});

const count = (values: readonly string[]) =>
  values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});

const bucketFromElapsed = (elapsedMs: number) => {
  if (elapsedMs <= 50) return '0-50';
  if (elapsedMs <= 250) return '51-250';
  if (elapsedMs <= 1_000) return '251-1000';
  return '1001+';
};

const pushStage = (
  stages: YootChatRuntimeHarnessStage[],
  stage: YootChatRuntimeHarnessStage,
  onStage: ((stage: YootChatRuntimeHarnessStage) => void) | undefined,
) => {
  stages.push(stage);
  onStage?.(stage);
};

const createTimedAbortSignal = (timeoutMs: number) => {
  if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal) {
    return AbortSignal.timeout(timeoutMs);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref?.();
  return controller.signal;
};

const composeAbortSignals = (signals: readonly AbortSignal[]) => {
  if (signals.some((signal) => signal.aborted)) {
    const controller = new AbortController();
    controller.abort();
    return controller.signal;
  }
  if (typeof AbortSignal !== 'undefined' && 'any' in AbortSignal) {
    return AbortSignal.any([...signals]);
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  for (const signal of signals) signal.addEventListener('abort', abort, { once: true });
  return controller.signal;
};

const withHarnessTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  onTimeout: () => void,
): Promise<T | 'HARNESS_TIMEOUT'> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<'HARNESS_TIMEOUT'>((resolve) => {
    timer = setTimeout(() => {
      onTimeout();
      resolve('HARNESS_TIMEOUT');
    }, timeoutMs);
  });
  const result = await Promise.race([promise, timeout]);
  if (timer) clearTimeout(timer);
  return result;
};

export async function runYootChatRuntimeHarness(options: YootChatRuntimeHarnessOptions): Promise<YootChatRuntimeHarnessResult> {
  const stages: YootChatRuntimeHarnessStage[] = [];
  const adapterEvents: YootChatReadObservation[] = [];
  let readStarted = false;
  let readSettled = false;
  const started = Date.now();
  const harnessAbortController = new AbortController();
  const createAdapterAbortSignal = options.createAbortSignal ?? createTimedAbortSignal;
  const createAbortSignal = (timeoutMs: number) => composeAbortSignals([
    createAdapterAbortSignal(timeoutMs),
    harnessAbortController.signal,
  ]);

  if (!options.skipPrecheckStages) {
    pushStage(stages, 'HARNESS_PRECHECK_START', options.onStage);
    pushStage(stages, 'HARNESS_PRECHECK_OK', options.onStage);
  }

  let client: ReadOnlySupabaseClient;
  try {
    if (options.createClient) client = options.createClient();
    else if (options.client) client = options.client;
    else throw new Error('client missing');
  } catch {
    pushStage(stages, 'HARNESS_BLOCKED', options.onStage);
    return {
      stages,
      aggregate: {
        ...emptyAggregate('HARNESS_BLOCKED', 'HARNESS_BLOCKED'),
        durationBucketMs: bucketFromElapsed(Date.now() - started),
      },
      adapterEventCounts: {},
    };
  }
  pushStage(stages, 'HARNESS_CLIENT_READY', options.onStage);

  const observer = (event: YootChatReadObservation) => {
    adapterEvents.push(event);
    if (event.code === 'YOOTCHAT_SUPABASE_READ_START' && !readStarted) {
      readStarted = true;
      pushStage(stages, 'HARNESS_READ_STARTED', options.onStage);
    }
    if (
      !readSettled &&
      [
        'YOOTCHAT_SUPABASE_READ_SUCCESS',
        'YOOTCHAT_SUPABASE_READ_TIMEOUT',
        'YOOTCHAT_SUPABASE_READ_RLS_ERROR',
        'YOOTCHAT_SUPABASE_READ_NETWORK_ERROR',
        'YOOTCHAT_SUPABASE_SCHEMA_ERROR',
        'YOOTCHAT_SUPABASE_FALLBACK',
      ].includes(event.code)
    ) {
      readSettled = true;
      pushStage(stages, 'HARNESS_READ_SETTLED', options.onStage);
    }
  };

  const runtime = createYootChatRuntime({
    client,
    observer,
    timeoutMs: options.adapterTimeoutMs,
    now: options.now,
    createAbortSignal,
  });
  pushStage(stages, 'HARNESS_RUNTIME_READY', options.onStage);
  pushStage(stages, 'HARNESS_EXECUTE_START', options.onStage);

  try {
    const executed = runtime.execute(options.request ?? dryRunHarnessRequest, { limit: 5, ...options.filters });
    executed.catch(() => undefined);
    const result = await withHarnessTimeout(
      executed,
      options.harnessTimeoutMs ?? DEFAULT_HARNESS_TIMEOUT_MS,
      () => harnessAbortController.abort(),
    );
    if (result === 'HARNESS_TIMEOUT') {
      pushStage(stages, 'HARNESS_TIMEOUT', options.onStage);
      return {
        stages,
        aggregate: {
          ...emptyAggregate('HARNESS_TIMEOUT', 'HARNESS_TIMEOUT'),
          requestCount: adapterEvents.filter((event) => event.code === 'YOOTCHAT_SUPABASE_READ_START').length,
          durationBucketMs: bucketFromElapsed(Date.now() - started),
        },
        adapterEventCounts: count(adapterEvents.map((event) => event.code)),
      };
    }

    if (!readSettled) pushStage(stages, 'HARNESS_READ_SETTLED', options.onStage);
    pushStage(stages, 'HARNESS_ENGINE_SETTLED', options.onStage);

    const quarantineReasons = result.read.quarantined.map((item) => item.reason);
    const aggregate: YootChatRuntimeHarnessAggregate = {
      requestCount: adapterEvents.filter((event) => event.code === 'YOOTCHAT_SUPABASE_READ_START').length,
      readOk: result.read.ok,
      readErrorCode: result.read.ok ? null : result.read.code,
      rowCount: result.read.rowCount,
      acceptedCount: result.read.acceptedCount,
      quarantinedCount: result.read.quarantined.length,
      quarantineReasonCounts: count(quarantineReasons),
      engineOk: result.engine.ok,
      topic: result.engine.response.topic,
      messageTemplate: result.engine.response.message.template,
      recommendationCount: result.engine.response.recommendations.length,
      limitationCodes: [...result.engine.response.limitations].sort(),
      interfaceActionCount: result.engine.response.interfaceActions.length,
      durationBucketMs: result.read.durationBucketMs,
      terminalStage: 'HARNESS_COMPLETED',
    };

    pushStage(stages, 'HARNESS_AGGREGATE_READY', options.onStage);
    pushStage(stages, 'HARNESS_COMPLETED', options.onStage);
    return { stages, aggregate, adapterEventCounts: count(adapterEvents.map((event) => event.code)) };
  } catch {
    pushStage(stages, 'HARNESS_BLOCKED', options.onStage);
    return {
      stages,
      aggregate: {
        ...emptyAggregate('HARNESS_BLOCKED', 'HARNESS_BLOCKED'),
        requestCount: adapterEvents.filter((event) => event.code === 'YOOTCHAT_SUPABASE_READ_START').length,
        durationBucketMs: bucketFromElapsed(Date.now() - started),
      },
      adapterEventCounts: count(adapterEvents.map((event) => event.code)),
    };
  }
}

const testRow = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: `Harness Merchant ${id}`,
  status: 'active',
  is_active: true,
  city: 'Harness City',
  latitude: null,
  longitude: null,
  google_rating: 4,
  category: 'Harness Category',
  opening_hours: { open_now: true },
  est_ess: false,
  est_bio: false,
  artisan_rm: false,
  est_societe_mission: false,
  ...overrides,
});

class OfflineBuilder implements PromiseLike<QueryResponse> {
  private signal: AbortSignal | null = null;

  constructor(
    private readonly response: QueryResponse | Error,
    private readonly operations: RecordedOperation[],
    private readonly scenario: OfflineScenario,
  ) {}

  eq(column: string, value: unknown) {
    this.operations.push(['eq', column, value]);
    return this;
  }

  not(column: string, operator: string, value: unknown) {
    this.operations.push(['not', column, operator, value]);
    return this;
  }

  in(column: string, values: readonly unknown[]) {
    this.operations.push(['in', column, values]);
    return this;
  }

  gte(column: string, value: unknown) {
    this.operations.push(['gte', column, value]);
    return this;
  }

  lte(column: string, value: unknown) {
    this.operations.push(['lte', column, value]);
    return this;
  }

  order(column: string, options?: { readonly ascending?: boolean }) {
    this.operations.push(['order', column, options]);
    return this;
  }

  limit(countValue: number) {
    this.operations.push(['limit', countValue]);
    return this;
  }

  abortSignal(signal: AbortSignal) {
    this.signal = signal;
    this.operations.push(['abortSignal', signal.aborted]);
    return this;
  }

  then<TResult1 = QueryResponse, TResult2 = never>(
    onfulfilled?: ((value: QueryResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    if (this.scenario === 'HANG') {
      const promise = new Promise<QueryResponse>((_resolve, reject) => {
        const abort = () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        this.operations.push(['pending', true]);
        if (this.signal?.aborted) {
          this.operations.push(['abortObserved', true]);
          abort();
          return;
        }
        this.signal?.addEventListener('abort', () => {
          this.operations.push(['abortObserved', true]);
          abort();
        }, { once: true });
      });
      return promise.then(onfulfilled, onrejected);
    }
    const promise = this.response instanceof Error ? Promise.reject(this.response) : Promise.resolve(this.response);
    return promise.then(onfulfilled, onrejected);
  }
}

export function createOfflineSupabaseClient(scenario: OfflineScenario = 'SUCCESS'): OfflineClient {
  const operations: RecordedOperation[] = [];
  const responseFor = (): QueryResponse | Error => {
    if (scenario === 'RLS_ERROR') return { data: null, error: { code: '42501', message: 'permission denied' } };
    if (scenario === 'NETWORK_ERROR') return new Error('network unavailable');
    if (scenario === 'TIMEOUT') return Object.assign(new Error('aborted'), { name: 'AbortError' });
    if (scenario === 'HANG') return { data: [], error: null };
    if (scenario === 'MALFORMED_RESPONSE') return { data: { malformed: true }, error: null };
    if (scenario === 'PARTIAL_QUARANTINE') return { data: [testRow('harness-1'), testRow('harness-2', { unexpected: true })], error: null };
    if (scenario === 'ENGINE_UNCERTIFIABLE') return { data: [testRow('harness-1')], error: null };
    return { data: [testRow('harness-1'), testRow('harness-2')], error: null };
  };

  return {
    operations,
    from(table: 'merchants') {
      operations.push(['from', table]);
      return {
        select(columns: string) {
          operations.push(['select', columns]);
          return new OfflineBuilder(responseFor(), operations, scenario);
        },
      };
    },
  };
}

export const expectedHarnessSelect = YOOTCHAT_SUPABASE_MERCHANT_SELECT;
