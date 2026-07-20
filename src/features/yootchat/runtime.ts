import type { YootChatRequest } from './contracts';
import {
  createYootChatSupabaseReadAdapter,
  type ReadOnlySupabaseClient,
} from './supabaseReadAdapter';
import {
  runYootChatWithMerchantReadPort,
  type YootChatReadEngineResult,
  type YootChatReadFilters,
  type YootChatReadObserver,
} from './readPort';

export interface YootChatRuntime {
  execute(
    request: YootChatRequest,
    filters?: YootChatReadFilters,
  ): Promise<YootChatReadEngineResult>;
}

export interface YootChatRuntimeOptions {
  readonly client: ReadOnlySupabaseClient;
  readonly observer?: YootChatReadObserver;
  readonly timeoutMs?: number;
  readonly now?: () => number;
  readonly createAbortSignal?: (timeoutMs: number) => AbortSignal;
}

export type YootChatPublicKeySource = 'PUBLISHABLE' | 'LEGACY_ANON';
export type YootChatPublicKeyRejectReason = 'MISSING' | 'FORBIDDEN' | 'UNKNOWN';

export type YootChatPublicKeyResolution =
  | {
      readonly ok: true;
      readonly key: string;
      readonly source: YootChatPublicKeySource;
    }
  | {
      readonly ok: false;
      readonly reason: YootChatPublicKeyRejectReason;
    };

export interface YootChatPublicEnv {
  readonly EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
}

const cleanEnvValue = (value: string | undefined) =>
  value?.trim().replace(/^['"]|['"]$/g, '') ?? '';

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    if (typeof globalThis.atob !== 'function') return null;
    const decoded = globalThis.atob(padded);
    const payload = JSON.parse(decoded) as unknown;
    return typeof payload === 'object' && payload !== null && !Array.isArray(payload) ? payload as Record<string, unknown> : null;
  } catch {
    return null;
  }
};

const classifyLegacyAnonKey = (key: string) => {
  const payload = decodeJwtPayload(key);
  if (payload?.role === 'anon') return 'ANON';
  if (payload?.role === 'service_role') return 'FORBIDDEN';
  return 'UNKNOWN';
};

export function resolveYootChatPublicSupabaseKey(env: YootChatPublicEnv): YootChatPublicKeyResolution {
  const publishable = cleanEnvValue(env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (publishable) {
    if (publishable.startsWith('sb_secret_') || /service_role/i.test(publishable)) return { ok: false, reason: 'FORBIDDEN' };
    return publishable.startsWith('sb_publishable_')
      ? { ok: true, key: publishable, source: 'PUBLISHABLE' }
      : { ok: false, reason: 'UNKNOWN' };
  }

  const legacyAnon = cleanEnvValue(env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  if (!legacyAnon) return { ok: false, reason: 'MISSING' };
  const classification = classifyLegacyAnonKey(legacyAnon);
  if (classification === 'ANON') return { ok: true, key: legacyAnon, source: 'LEGACY_ANON' };
  if (classification === 'FORBIDDEN') return { ok: false, reason: 'FORBIDDEN' };
  return { ok: false, reason: 'UNKNOWN' };
}

export function createYootChatRuntime(options: YootChatRuntimeOptions): YootChatRuntime {
  return {
    async execute(request, filters) {
      const adapter = createYootChatSupabaseReadAdapter({
        client: options.client,
        observer: options.observer,
        timeoutMs: options.timeoutMs,
        now: options.now,
        createAbortSignal: options.createAbortSignal,
      });
      return runYootChatWithMerchantReadPort(adapter, request, filters);
    },
  };
}
