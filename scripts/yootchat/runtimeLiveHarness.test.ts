import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  createOfflineSupabaseClient,
  expectedHarnessSelect,
  runYootChatRuntimeHarness,
  YOOTCHAT_RUNTIME_HARNESS_STAGES,
} from './runtimeLiveHarness';
import { prepareRuntimeManualConfig } from './runtime-live.manual';

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

  test('does not use direct fetch in the harness files', () => {
    const harness = readFileSync('scripts/yootchat/runtimeLiveHarness.ts', 'utf8');
    const manual = readFileSync('scripts/yootchat/runtime-live.manual.ts', 'utf8');

    expect(`${harness}\n${manual}`).not.toMatch(/\bfetch\s*\(/);
  });

  test('does not define writes or RPC in the harness files', () => {
    const harness = readFileSync('scripts/yootchat/runtimeLiveHarness.ts', 'utf8');
    const manual = readFileSync('scripts/yootchat/runtime-live.manual.ts', 'utf8');

    expect(`${harness}\n${manual}`).not.toMatch(/\.(insert|update|upsert|delete|rpc)\s*\(/);
  });

  test('manual entry is not discovered by the normal Jest suite pattern', () => {
    expect('runtime-live.manual.ts').not.toMatch(/(\.test|\.spec)\.[jt]sx?$/);
  });

  test('all emitted harness stages belong to the closed list', async () => {
    const result = await runYootChatRuntimeHarness({ client: createOfflineSupabaseClient('SUCCESS') });

    expect(result.stages.every((stage) => YOOTCHAT_RUNTIME_HARNESS_STAGES.includes(stage))).toBe(true);
  });
});
