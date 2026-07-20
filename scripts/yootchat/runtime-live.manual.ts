import { createClient } from '@supabase/supabase-js';
import { resolveYootChatPublicSupabaseKey, type ReadOnlySupabaseClient } from '../../src/features/yootchat';
import {
  createOfflineSupabaseClient,
  futureLiveHarnessRequest,
  runYootChatRuntimeHarness,
  type YootChatRuntimeHarnessResult,
} from './runtimeLiveHarness';

export type RuntimeManualMode = 'DRY_RUN' | 'LIVE';

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
  const config = prepareRuntimeManualConfig(env);
  if (!config.ok) {
    writeLine(JSON.stringify({ terminalStage: 'HARNESS_BLOCKED', reason: config.reason }));
    return config;
  }

  let createHarnessClient: () => ReadOnlySupabaseClient;
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
    createHarnessClient = () => createSupabaseReadOnlyClient(url, resolved.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
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
  });
  writeLine(JSON.stringify({ aggregate: result.aggregate }));
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
