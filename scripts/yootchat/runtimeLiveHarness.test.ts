import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  createOfflineSupabaseClient,
  expectedHarnessSelect,
  futureLiveHarnessRequest,
  runYootChatRuntimeHarness,
  YOOTCHAT_RUNTIME_HARNESS_STAGES,
} from './runtimeLiveHarness';
import { createRuntimeManualRequest, prepareRuntimeManualConfig, runRuntimeManualHarness } from './runtime-live.manual';

const cleanEnv = {
  YOOTCHAT_RUNTIME_MODE: undefined,
  YOOTCHAT_LIVE_CONFIRM: undefined,
  EXPO_PUBLIC_SUPABASE_URL: undefined,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: undefined,
} as NodeJS.ProcessEnv;

const fakeSupabaseUrl = `https://${'project-ref'}.supabase.co`;
const fakePublishableKey = ['sb', 'publishable', 'test'].join('_');
const forbiddenSecretKey = ['sb', 'secret', 'forbidden'].join('_');
const fakeAnonJwt = [
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify({ role: 'anon', ref: 'local-test' })).toString('base64url'),
  'signature',
].join('.');

const publicLiveEnv = {
  YOOTCHAT_RUNTIME_MODE: 'LIVE',
  YOOTCHAT_LIVE_CONFIRM: 'YES',
  EXPO_PUBLIC_SUPABASE_URL: fakeSupabaseUrl,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: fakePublishableKey,
} as NodeJS.ProcessEnv;

const expectedSuccessStages = [
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
];

describe('YootChat runtime live harness Lot 5B-D', () => {
  test('accepts valid dry-run preconditions without Supabase variables', () => {
    expect(prepareRuntimeManualConfig({ ...cleanEnv, YOOTCHAT_RUNTIME_MODE: 'DRY_RUN' })).toEqual({
      ok: true,
      mode: 'DRY_RUN',
      clientKind: 'OFFLINE',
    });
  });

  test('refuses a missing mode before client creation', () => {
    expect(prepareRuntimeManualConfig(cleanEnv)).toEqual({ ok: false, reason: 'MODE_MISSING' });
  });

  test('manual precheck starts before configuration and blocks without leaking values', async () => {
    const lines: string[] = [];
    const result = await runRuntimeManualHarness(cleanEnv, (line) => lines.push(line));

    expect(result).toEqual({ ok: false, reason: 'MODE_MISSING' });
    expect(lines).toEqual([
      JSON.stringify({ stage: 'HARNESS_PRECHECK_START' }),
      JSON.stringify({ stage: 'HARNESS_BLOCKED' }),
    ]);
    expect(JSON.stringify(lines)).not.toContain('MODE_MISSING');
  });

  test('refuses an unknown mode before client creation', () => {
    expect(prepareRuntimeManualConfig({ ...cleanEnv, YOOTCHAT_RUNTIME_MODE: 'TEST' })).toEqual({ ok: false, reason: 'MODE_UNKNOWN' });
  });

  test('refuses live mode without exact confirmation', () => {
    expect(prepareRuntimeManualConfig({ ...cleanEnv, YOOTCHAT_RUNTIME_MODE: 'LIVE' })).toEqual({
      ok: false,
      reason: 'LIVE_CONFIRMATION_MISSING',
    });
  });

  test('refuses live mode with a missing public key before network', () => {
    expect(prepareRuntimeManualConfig({
      ...cleanEnv,
      YOOTCHAT_RUNTIME_MODE: 'LIVE',
      YOOTCHAT_LIVE_CONFIRM: 'YES',
      EXPO_PUBLIC_SUPABASE_URL: fakeSupabaseUrl,
    })).toEqual({ ok: false, reason: 'KEY_MISSING' });
  });

  test('refuses forbidden keys before network', () => {
    expect(prepareRuntimeManualConfig({
      ...publicLiveEnv,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: forbiddenSecretKey,
    })).toEqual({ ok: false, reason: 'KEY_FORBIDDEN' });
  });

  test('requires a publishable key for future live mode and refuses legacy anon', () => {
    expect(prepareRuntimeManualConfig({
      ...cleanEnv,
      YOOTCHAT_RUNTIME_MODE: 'LIVE',
      YOOTCHAT_LIVE_CONFIRM: 'YES',
      EXPO_PUBLIC_SUPABASE_URL: fakeSupabaseUrl,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: fakeAnonJwt,
    })).toEqual({ ok: false, reason: 'KEY_MISSING' });
  });

  test('uses a fake client for exactly one read', async () => {
    const client = createOfflineSupabaseClient('SUCCESS');
    const result = await runYootChatRuntimeHarness({ client });

    expect(result.aggregate.requestCount).toBe(1);
    expect(client.operations.filter(([name]) => name === 'from')).toHaveLength(1);
  });

  test('uses one explicit projection and never select star', async () => {
    const client = createOfflineSupabaseClient('SUCCESS');
    await runYootChatRuntimeHarness({ client });

    expect(client.operations.filter(([name]) => name === 'select')).toEqual([['select', expectedHarnessSelect]]);
    expect(JSON.stringify(client.operations)).not.toContain('*');
  });

  test('passes limit 5 to the runtime read', async () => {
    const client = createOfflineSupabaseClient('SUCCESS');
    await runYootChatRuntimeHarness({ client });

    expect(client.operations).toContainEqual(['limit', 5]);
  });

  test('uses the future live request without synthetic city or business filters', () => {
    expect(createRuntimeManualRequest('LIVE')).toEqual(futureLiveHarnessRequest);
    expect(createRuntimeManualRequest('LIVE')).not.toHaveProperty('city');
    expect(createRuntimeManualRequest('LIVE')).not.toHaveProperty('location');
    expect(createRuntimeManualRequest('LIVE')).not.toHaveProperty('filters');
  });

  test('manual live mode emits a bounded transport envelope after the aggregate', async () => {
    const originalFetch = globalThis.fetch;
    const lines: string[] = [];
    globalThis.fetch = (async () => new Response(JSON.stringify([{
      id: 1,
      name: 'Manual Harness Merchant',
      status: 'active',
      is_active: true,
      city: 'Manual City',
      latitude: null,
      longitude: null,
      google_rating: 4,
      category: 'Manual Category',
      opening_hours: { open_now: true },
      est_ess: false,
      est_bio: false,
      artisan_rm: false,
      est_societe_mission: false,
    }]), { status: 200, headers: { 'content-type': 'application/json' } })) as typeof fetch;

    try {
      const result = await runRuntimeManualHarness(publicLiveEnv, (line) => lines.push(line));
      expect('stages' in result ? result.aggregate.readOk : false).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }

    const aggregateIndex = lines.findIndex((line) => line.includes('"aggregate"'));
    const transportIndex = lines.findIndex((line) => line.includes('"transport"'));
    expect(aggregateIndex).toBeGreaterThan(-1);
    expect(transportIndex).toBeGreaterThan(aggregateIndex);
    expect(JSON.parse(lines[transportIndex])).toEqual({
      transport: {
        logicalCallCount: 1,
        physicalCallCount: 1,
        retryBlocked: false,
        firstOutcome: 'HTTP_RESPONSE',
        firstHttpStatus: 200,
        firstHttpStatusClass: 'HTTP_2XX',
      },
    });
    expect(JSON.stringify(lines)).not.toContain(fakeSupabaseUrl);
    expect(JSON.stringify(lines)).not.toContain(fakePublishableKey);
    expect(JSON.stringify(lines)).not.toContain('Manual Harness Merchant');
  });

  test('does not retry after a network error', async () => {
    const client = createOfflineSupabaseClient('NETWORK_ERROR');
    const result = await runYootChatRuntimeHarness({ client });

    expect(result.aggregate.requestCount).toBe(1);
    expect(client.operations.filter(([name]) => name === 'select')).toHaveLength(1);
  });

  test('emits deterministic stages in successful offline mode', async () => {
    const result = await runYootChatRuntimeHarness({ client: createOfflineSupabaseClient('SUCCESS') });

    expect(result.stages).toEqual(expectedSuccessStages);
  });

  test('streams stages once and keeps the final list in the same order', async () => {
    const streamed: string[] = [];
    const result = await runYootChatRuntimeHarness({
      client: createOfflineSupabaseClient('SUCCESS'),
      onStage: (stage) => streamed.push(stage),
    });

    expect(streamed).toEqual(result.stages);
    expect(streamed).toEqual(expectedSuccessStages);
  });

  test('makes pre-wait stages observable before a delayed client settles', async () => {
    const streamed: string[] = [];
    const promise = runYootChatRuntimeHarness({
      client: createOfflineSupabaseClient('HANG'),
      harnessTimeoutMs: 25,
      onStage: (stage) => streamed.push(stage),
    });

    expect(streamed).toEqual([
      'HARNESS_PRECHECK_START',
      'HARNESS_PRECHECK_OK',
      'HARNESS_CLIENT_READY',
      'HARNESS_RUNTIME_READY',
      'HARNESS_EXECUTE_START',
      'HARNESS_READ_STARTED',
    ]);

    const result = await promise;
    expect(result.aggregate.terminalStage).toBe('HARNESS_TIMEOUT');
  });

  test('aborts the pending read when the harness timeout fires', async () => {
    const client = createOfflineSupabaseClient('HANG');
    const result = await runYootChatRuntimeHarness({ client, harnessTimeoutMs: 25 });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.aggregate.readErrorCode).toBe('HARNESS_TIMEOUT');
    expect(client.operations).toContainEqual(['abortObserved', true]);
  });

  test('adapter timeout shorter than harness timeout returns SUPABASE_TIMEOUT and completes', async () => {
    const client = createOfflineSupabaseClient('HANG');
    const result = await runYootChatRuntimeHarness({
      client,
      adapterTimeoutMs: 25,
      harnessTimeoutMs: 500,
    });

    expect(result.aggregate.readErrorCode).toBe('SUPABASE_TIMEOUT');
    expect(result.aggregate.terminalStage).toBe('HARNESS_COMPLETED');
    expect(client.operations).toContainEqual(['abortObserved', true]);
  });

  test('harness timeout shorter than adapter timeout returns HARNESS_TIMEOUT', async () => {
    const client = createOfflineSupabaseClient('HANG');
    const result = await runYootChatRuntimeHarness({
      client,
      adapterTimeoutMs: 500,
      harnessTimeoutMs: 25,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.aggregate.readErrorCode).toBe('HARNESS_TIMEOUT');
    expect(result.aggregate.terminalStage).toBe('HARNESS_TIMEOUT');
    expect(client.operations).toContainEqual(['abortObserved', true]);
  });

  test('returns a bounded success aggregate offline', async () => {
    const result = await runYootChatRuntimeHarness({ client: createOfflineSupabaseClient('SUCCESS') });

    expect(result.aggregate).toMatchObject({
      requestCount: 1,
      readOk: true,
      readErrorCode: null,
      rowCount: 2,
      acceptedCount: 2,
      engineOk: true,
      messageTemplate: 'RESULTS_FOUND',
      terminalStage: 'HARNESS_COMPLETED',
    });
  });

  test('aggregates simulated RLS errors', async () => {
    const result = await runYootChatRuntimeHarness({ client: createOfflineSupabaseClient('RLS_ERROR') });

    expect(result.aggregate.readOk).toBe(false);
    expect(result.aggregate.readErrorCode).toBe('SUPABASE_RLS_DENIED');
  });

  test('aggregates simulated network errors', async () => {
    const result = await runYootChatRuntimeHarness({ client: createOfflineSupabaseClient('NETWORK_ERROR') });

    expect(result.aggregate.readOk).toBe(false);
    expect(result.aggregate.readErrorCode).toBe('SUPABASE_NETWORK_ERROR');
  });

  test('aggregates simulated read timeouts', async () => {
    const result = await runYootChatRuntimeHarness({ client: createOfflineSupabaseClient('TIMEOUT') });

    expect(result.aggregate.readOk).toBe(false);
    expect(result.aggregate.readErrorCode).toBe('SUPABASE_TIMEOUT');
  });

  test('aggregates malformed responses', async () => {
    const result = await runYootChatRuntimeHarness({ client: createOfflineSupabaseClient('MALFORMED_RESPONSE') });

    expect(result.aggregate.readOk).toBe(false);
    expect(result.aggregate.readErrorCode).toBe('MALFORMED_RESPONSE');
  });

  test('aggregates partial quarantine without leaking row contents', async () => {
    const result = await runYootChatRuntimeHarness({ client: createOfflineSupabaseClient('PARTIAL_QUARANTINE') });

    expect(result.aggregate.readOk).toBe(true);
    expect(result.aggregate.quarantinedCount).toBe(1);
    expect(result.aggregate.quarantineReasonCounts.UNKNOWN_PROPERTY).toBe(1);
    expect(JSON.stringify(result.aggregate)).not.toContain('Harness Merchant');
  });

  test('aggregates non-certifiable engine results', async () => {
    const result = await runYootChatRuntimeHarness({
      client: createOfflineSupabaseClient('ENGINE_UNCERTIFIABLE'),
      request: { message: '', language: 'fr' },
    });

    expect(result.aggregate.engineOk).toBe(false);
    expect(result.aggregate.readErrorCode).toBe('ENGINE_UNCERTIFIED');
  });

  test('keeps steps free of sensitive data', async () => {
    const result = await runYootChatRuntimeHarness({ client: createOfflineSupabaseClient('SUCCESS') });
    const serialized = JSON.stringify(result.stages);

    expect(serialized).not.toContain('supabase.co');
    expect(serialized).not.toContain('sb_publishable');
    expect(serialized).not.toContain('Bearer');
    expect(serialized).not.toContain('Harness Merchant');
  });

  test('keeps aggregate free of sensitive data and merchant rows', async () => {
    const result = await runYootChatRuntimeHarness({ client: createOfflineSupabaseClient('SUCCESS') });
    const serialized = JSON.stringify(result.aggregate);

    expect(serialized).not.toContain('supabase.co');
    expect(serialized).not.toContain('sb_publishable');
    expect(serialized).not.toContain('Bearer');
    expect(serialized).not.toContain('Harness Merchant');
    expect(serialized).not.toContain('harness-1');
  });

  test('returns the same output for the same offline input', async () => {
    const first = await runYootChatRuntimeHarness({ client: createOfflineSupabaseClient('SUCCESS'), now: () => 0 });
    const second = await runYootChatRuntimeHarness({ client: createOfflineSupabaseClient('SUCCESS'), now: () => 0 });

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  test('finishes the manual dry-run process without force exit', () => {
    const child = spawnSync(
      process.execPath,
      [
        './node_modules/.bin/jest',
        '--watchman=false',
        '--testRegex',
        'scripts/yootchat/runtime-live\\.manual\\.ts$',
        '--runTestsByPath',
        'scripts/yootchat/runtime-live.manual.ts',
        '--runInBand',
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          YOOTCHAT_MANUAL_JEST_ENTRY: '1',
          YOOTCHAT_RUNTIME_MODE: 'DRY_RUN',
          YOOTCHAT_LIVE_CONFIRM: 'NO',
          EXPO_PUBLIC_SUPABASE_URL: '',
          EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
          EXPO_PUBLIC_SUPABASE_ANON_KEY: '',
        },
        encoding: 'utf8',
        timeout: 10_000,
      },
    );

    expect(child.status).toBe(0);
    expect(child.signal).toBeNull();
    expect(`${child.stdout}\n${child.stderr}`).not.toContain('--forceExit');
  });

  test('watchdog lets a normal child finish with a controlled exit code', () => {
    const child = spawnSync(process.execPath, ['scripts/yootchat/runtime-live-watchdog.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        YOOTCHAT_WATCHDOG_TEST_CHILD: 'EXIT_0',
        YOOTCHAT_WATCHDOG_TIMEOUT_MS: '1000',
      },
      encoding: 'utf8',
      timeout: 5_000,
    });

    expect(child.status).toBe(0);
    expect(child.stdout).toContain('"watchdog":"COMPLETED"');
    expect(child.stdout).toContain('HARNESS_COMPLETED');
  });

  test('watchdog terminates a blocked child and returns 124 with the last stage', () => {
    const child = spawnSync(process.execPath, ['scripts/yootchat/runtime-live-watchdog.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        YOOTCHAT_WATCHDOG_TEST_CHILD: 'HANG',
        YOOTCHAT_WATCHDOG_TIMEOUT_MS: '50',
      },
      encoding: 'utf8',
      timeout: 5_000,
    });

    expect(child.status).toBe(124);
    expect(child.stdout).toContain('"watchdog":"TIMEOUT"');
    expect(child.stdout).toContain('"childTerminated":true');
    expect(child.stdout).toContain('"lastStage":"HARNESS_EXECUTE_START"');
  });

  test('watchdog filters sensitive-looking child output', () => {
    const child = spawnSync(process.execPath, ['scripts/yootchat/runtime-live-watchdog.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        YOOTCHAT_WATCHDOG_TEST_CHILD: 'LEAK_EXIT',
        YOOTCHAT_WATCHDOG_TIMEOUT_MS: '1000',
      },
      encoding: 'utf8',
      timeout: 5_000,
    });

    expect(child.status).toBe(0);
    expect(child.stdout).not.toContain('sb_publishable');
    expect(child.stdout).toContain('HARNESS_COMPLETED');
  });

  test('watchdog forwards the bounded transport envelope', () => {
    const child = spawnSync(process.execPath, ['scripts/yootchat/runtime-live-watchdog.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        YOOTCHAT_WATCHDOG_TEST_CHILD: 'TRANSPORT_EXIT',
        YOOTCHAT_WATCHDOG_TIMEOUT_MS: '1000',
      },
      encoding: 'utf8',
      timeout: 5_000,
    });

    expect(child.status).toBe(0);
    expect(child.stdout).toContain('"transport"');
    expect(child.stdout).toContain('"firstHttpStatus":200');
    expect(child.stdout).not.toContain('supabase.co');
    expect(child.stdout).not.toContain('Bearer');
  });

  test('dry-run completes through the watchdog without Supabase configuration', () => {
    const child = spawnSync(process.execPath, ['scripts/yootchat/runtime-live-watchdog.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        YOOTCHAT_RUNTIME_MODE: 'DRY_RUN',
        YOOTCHAT_LIVE_CONFIRM: 'NO',
        EXPO_PUBLIC_SUPABASE_URL: '',
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
        EXPO_PUBLIC_SUPABASE_ANON_KEY: '',
        YOOTCHAT_MANUAL_JEST_ENTRY: '1',
        YOOTCHAT_WATCHDOG_TIMEOUT_MS: '10000',
      },
      encoding: 'utf8',
      timeout: 15_000,
    });

    expect(child.status).toBe(0);
    expect(child.stdout).toContain('HARNESS_COMPLETED');
    expect(child.stdout).not.toContain('Trouve-moi des commerces locaux');
  });

  test('does not use direct unguarded fetch in the harness files', () => {
    const harness = readFileSync('scripts/yootchat/runtimeLiveHarness.ts', 'utf8');
    const manual = readFileSync('scripts/yootchat/runtime-live.manual.ts', 'utf8');
    const watchdog = readFileSync('scripts/yootchat/runtime-live-watchdog.mjs', 'utf8');

    expect(`${harness}\n${watchdog}`).not.toMatch(/\bfetch\s*\(/);
    expect(manual).toContain('createSinglePhysicalFetchGuard');
    expect(manual).toContain('fetch: guard.fetch');
  });

  test('does not define writes or RPC in the harness files', () => {
    const harness = readFileSync('scripts/yootchat/runtimeLiveHarness.ts', 'utf8');
    const manual = readFileSync('scripts/yootchat/runtime-live.manual.ts', 'utf8');
    const watchdog = readFileSync('scripts/yootchat/runtime-live-watchdog.mjs', 'utf8');

    expect(`${harness}\n${manual}\n${watchdog}`).not.toMatch(/\.(insert|update|upsert|delete|rpc)\s*\(/);
  });

  test('manual entry is not discovered by the normal Jest suite pattern', () => {
    expect('runtime-live.manual.ts').not.toMatch(/(\.test|\.spec)\.[jt]sx?$/);
  });

  test('all emitted harness stages belong to the closed list', async () => {
    const result = await runYootChatRuntimeHarness({ client: createOfflineSupabaseClient('SUCCESS') });

    expect(result.stages.every((stage) => YOOTCHAT_RUNTIME_HARNESS_STAGES.includes(stage))).toBe(true);
  });
});
