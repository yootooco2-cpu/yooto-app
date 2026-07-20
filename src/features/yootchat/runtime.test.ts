import {
  YOOTCHAT_SUPABASE_DEFAULT_LIMIT,
  YOOTCHAT_SUPABASE_MAX_LIMIT,
  YOOTCHAT_SUPABASE_MERCHANT_SELECT,
  createYootChatRuntime,
  resolveYootChatPublicSupabaseKey,
  type ReadOnlySupabaseClient,
  type YootChatReadObservation,
  type YootChatRequest,
} from './index';

type Operation = readonly [string, ...unknown[]];
type QueryResponse = {
  readonly data: unknown;
  readonly error: null | { readonly code?: string; readonly message?: string; readonly name?: string; readonly status?: number };
  readonly status?: number;
};

class FakeBuilder implements PromiseLike<QueryResponse> {
  constructor(
    private readonly response: QueryResponse | Error,
    private readonly operations: Operation[],
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

  limit(count: number) {
    this.operations.push(['limit', count]);
    return this;
  }

  abortSignal(signal: AbortSignal) {
    this.operations.push(['abortSignal', signal.aborted]);
    return this;
  }

  insert() {
    throw new Error('write method called');
  }

  update() {
    throw new Error('write method called');
  }

  upsert() {
    throw new Error('write method called');
  }

  delete() {
    throw new Error('write method called');
  }

  then<TResult1 = QueryResponse, TResult2 = never>(
    onfulfilled?: ((value: QueryResponse) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const promise = this.response instanceof Error ? Promise.reject(this.response) : Promise.resolve(this.response);
    return promise.then(onfulfilled, onrejected);
  }
}

class FakeClient implements ReadOnlySupabaseClient {
  readonly operations: Operation[] = [];

  constructor(private readonly response: QueryResponse | Error) {}

  from(table: 'merchants') {
    this.operations.push(['from', table]);
    return {
      select: (columns: string) => {
        this.operations.push(['select', columns]);
        return new FakeBuilder(this.response, this.operations);
      },
    };
  }
}

const validRow = (id: number, overrides: Record<string, unknown> = {}) => ({
  id,
  name: `Commerce ${id}`,
  status: 'active',
  is_active: true,
  city: 'Quissac',
  latitude: 43.91 + id / 1000,
  longitude: 4 + id / 1000,
  google_rating: 4.5,
  category: 'Boulangerie',
  opening_hours: { open_now: true },
  est_ess: null,
  est_bio: true,
  artisan_rm: null,
  est_societe_mission: null,
  ...overrides,
});

const request = (message = 'Une boulangerie locale'): YootChatRequest => ({
  message,
  language: 'fr',
  city: 'Quissac',
});

const runtimeFor = (response: QueryResponse | Error, events: YootChatReadObservation[] = []) => {
  const client = new FakeClient(response);
  const runtime = createYootChatRuntime({
    client,
    observer: (event) => events.push(event),
    now: () => 0,
    createAbortSignal: () => new AbortController().signal,
  });
  return { runtime, client, events };
};

const fakeAnonJwt = (role: string) => {
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ role, ref: 'local-test' })}.signature`;
};

describe('YootChat runtime Lot 5A', () => {
  test('runs read adapter then deterministic engine and returns a certified response', async () => {
    const { runtime, client } = runtimeFor({ data: [validRow(101)], error: null });
    const result = await runtime.execute(request());

    expect(result.read.ok).toBe(true);
    expect(result.engine.ok).toBe(true);
    expect(result.engine.response.message.template).toBe('RESULTS_FOUND');
    expect(result.engine.response.recommendations).toHaveLength(1);
    expect(client.operations.filter(([name]) => name === 'select')).toHaveLength(1);
    expect(client.operations).toContainEqual(['select', YOOTCHAT_SUPABASE_MERCHANT_SELECT]);
  });

  test('applies one bounded read with the default limit', async () => {
    const { runtime, client } = runtimeFor({ data: [validRow(101)], error: null });
    await runtime.execute(request());

    expect(client.operations).toContainEqual(['eq', 'status', 'active']);
    expect(client.operations).toContainEqual(['eq', 'is_active', true]);
    expect(client.operations).toContainEqual(['limit', YOOTCHAT_SUPABASE_DEFAULT_LIMIT]);
  });

  test('returns identical outputs for identical inputs', async () => {
    const response = { data: [validRow(102), validRow(101)], error: null };
    const first = await runtimeFor(response).runtime.execute(request());
    const second = await runtimeFor(response).runtime.execute(request());

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  test('quarantines one invalid row without contaminating valid rows', async () => {
    const { runtime } = runtimeFor({ data: [validRow(101), validRow(102, { unknown_private_note: 'x' })], error: null });
    const result = await runtime.execute(request());

    expect(result.read.ok).toBe(true);
    if (!result.read.ok) return;
    expect(result.read.acceptedCount).toBe(1);
    expect(result.read.quarantined).toHaveLength(1);
    expect(result.engine.response.recommendations).toHaveLength(1);
  });

  test('falls back safely when too many rows are invalid', async () => {
    const { runtime } = runtimeFor({
      data: [validRow(101), validRow(102, { google_rating: 9 }), validRow(103, { latitude: 200 })],
      error: null,
    });
    const result = await runtime.execute(request());

    expect(result.read.ok).toBe(false);
    expect(result.read.ok ? null : result.read.code).toBe('TOO_MANY_INVALID_ROWS');
    expect(result.engine.ok).toBe(false);
    expect(result.engine.response.message.template).toBe('SERVICE_UNAVAILABLE');
  });

  test('falls back deterministically when there are no active rows', async () => {
    const { runtime } = runtimeFor({ data: [], error: null });
    const result = await runtime.execute(request());

    expect(result.read.ok).toBe(false);
    expect(result.read.ok ? null : result.read.code).toBe('NO_ACTIVE_ROWS');
    expect(result.engine.response.message.template).toBe('NO_RESULT');
  });

  test('maps Supabase failures to typed deterministic fallbacks', async () => {
    const cases: readonly [QueryResponse | Error, string][] = [
      [Object.assign(new Error('aborted'), { name: 'AbortError' }), 'SUPABASE_TIMEOUT'],
      [{ data: null, error: { code: 'PGRST301' }, status: 401 }, 'SUPABASE_AUTH_REJECTED'],
      [{ data: null, error: { code: '42501' }, status: 403 }, 'SUPABASE_RLS_DENIED'],
      [{ data: null, error: { code: '42703' }, status: 400 }, 'SCHEMA_INCOMPATIBLE'],
      [new TypeError('network'), 'SUPABASE_NETWORK_ERROR'],
      [{ data: null, error: { code: 'YOOTCHAT_RETRY_BLOCKED' }, status: 599 }, 'SUPABASE_RETRY_BLOCKED'],
      [{ data: null, error: { code: 'PGRST999' }, status: 418 }, 'SUPABASE_UNAVAILABLE'],
      [{ data: { id: 1 }, error: null }, 'MALFORMED_RESPONSE'],
    ];

    for (const [response, code] of cases) {
      const result = await runtimeFor(response).runtime.execute(request());
      expect(result.read.ok).toBe(false);
      expect(result.read.ok ? null : result.read.code).toBe(code);
      expect(result.engine.ok).toBe(false);
    }
  });

  test('returns ENGINE_UNCERTIFIED when the deterministic engine rejects the request', async () => {
    const { runtime } = runtimeFor({ data: [validRow(101)], error: null });
    const result = await runtime.execute({ message: '', language: 'fr' });

    expect(result.read.ok).toBe(false);
    expect(result.read.ok ? null : result.read.code).toBe('ENGINE_UNCERTIFIED');
    expect(result.engine.ok).toBe(false);
    expect(result.engine.response.message.template).toBe('CLARIFICATION_REQUIRED');
  });

  test('handles message length boundaries deterministically', async () => {
    const accepted = await runtimeFor({ data: [validRow(101)], error: null }).runtime.execute(request('a'.repeat(800)));
    const empty = await runtimeFor({ data: [validRow(101)], error: null }).runtime.execute(request(''));
    const tooLong = await runtimeFor({ data: [validRow(101)], error: null }).runtime.execute(request('a'.repeat(801)));

    expect(accepted.engine.ok).toBe(true);
    expect(empty.read.ok ? null : empty.read.code).toBe('ENGINE_UNCERTIFIED');
    expect(tooLong.read.ok ? null : tooLong.read.code).toBe('ENGINE_UNCERTIFIED');
  });

  test('limits recommendations to three', async () => {
    const { runtime } = runtimeFor({ data: [validRow(101), validRow(102), validRow(103), validRow(104), validRow(105)], error: null });
    const result = await runtime.execute(request());

    expect(result.engine.response.recommendations).toHaveLength(3);
  });

  test('keeps Supabase accessibility unknown and exposes the limitation', async () => {
    const { runtime } = runtimeFor({ data: [validRow(101)], error: null });
    const result = await runtime.execute(request());

    expect(result.read.ok).toBe(true);
    if (!result.read.ok) return;
    expect(result.read.records[0].accessibility).toBe('UNKNOWN');
    expect(result.engine.response.limitations).toContain('UNKNOWN_ACCESSIBILITY');
    expect(JSON.stringify(result.engine.response.recommendations)).not.toContain('VERIFIED_ACCESSIBLE');
    expect(JSON.stringify(result.engine.response.recommendations)).not.toContain('VERIFIED_NOT_ACCESSIBLE');
  });

  test('keeps official commitments structured', async () => {
    const { runtime } = runtimeFor({ data: [validRow(101, { est_ess: true, est_bio: true, artisan_rm: true, est_societe_mission: true })], error: null });
    const result = await runtime.execute(request());

    expect(result.read.ok).toBe(true);
    if (!result.read.ok) return;
    expect(result.read.records[0].officialCommitments).toHaveLength(4);
    expect(JSON.stringify(result.engine.response.recommendations)).toContain('officialCommitment');
  });

  test('passes bounded filters through the read adapter without arbitrary SQL', async () => {
    const { runtime, client } = runtimeFor({ data: [validRow(101)], error: null });
    await runtime.execute(request(), {
      city: 'Quissac',
      categoryIds: ['Boulangerie'],
      allowedMerchantIds: ['101'],
      origin: { latitude: 43.91, longitude: 4, radiusKm: 2 },
      limit: YOOTCHAT_SUPABASE_MAX_LIMIT,
    });

    expect(client.operations).toContainEqual(['eq', 'city', 'Quissac']);
    expect(client.operations).toContainEqual(['in', 'category', ['Boulangerie']]);
    expect(client.operations).toContainEqual(['in', 'id', ['101']]);
    expect(client.operations).toContainEqual(['limit', YOOTCHAT_SUPABASE_MAX_LIMIT]);
    expect(client.operations.some(([name]) => name === 'or')).toBe(false);
  });

  test('does not leak secrets, user text, identifiers or coordinates in observations', async () => {
    const events: YootChatReadObservation[] = [];
    const { runtime } = runtimeFor({ data: [validRow(101), validRow(102, { email: 'secret@example.com' })], error: null }, events);
    await runtime.execute({
      message: 'texte utilisateur sensible',
      language: 'fr',
      location: { latitude: 43.91, longitude: 4, precision: 'APPROXIMATE' },
    });

    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain('secret@example.com');
    expect(serialized).not.toContain('texte utilisateur sensible');
    expect(serialized).not.toContain('101');
    expect(serialized).not.toContain('43.91');
    expect(serialized).not.toContain('apikey');
    expect(serialized).not.toContain('Bearer');
  });

  test('prefers a publishable key when publishable and anon are both defined', () => {
    const resolved = resolveYootChatPublicSupabaseKey({
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_yootchat',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: fakeAnonJwt('anon'),
    });

    expect(resolved).toEqual({ ok: true, key: 'sb_publishable_yootchat', source: 'PUBLISHABLE' });
  });

  test('accepts a legacy anon key when publishable is absent', () => {
    const resolved = resolveYootChatPublicSupabaseKey({
      EXPO_PUBLIC_SUPABASE_ANON_KEY: fakeAnonJwt('anon'),
    });

    expect(resolved.ok).toBe(true);
    expect(resolved.ok ? resolved.source : null).toBe('LEGACY_ANON');
  });

  test('refuses secret, privileged and unknown keys', () => {
    expect(resolveYootChatPublicSupabaseKey({ EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_forbidden' })).toEqual({ ok: false, reason: 'FORBIDDEN' });
    expect(resolveYootChatPublicSupabaseKey({ EXPO_PUBLIC_SUPABASE_ANON_KEY: fakeAnonJwt('service_role') })).toEqual({ ok: false, reason: 'FORBIDDEN' });
    expect(resolveYootChatPublicSupabaseKey({ EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'not-a-public-key' })).toEqual({ ok: false, reason: 'UNKNOWN' });
    expect(resolveYootChatPublicSupabaseKey({})).toEqual({ ok: false, reason: 'MISSING' });
  });

  test('runtime service stays independent from React Native and direct network APIs', () => {
    const runtimeModule = jest.requireActual('./runtime') as Record<string, unknown>;

    expect(runtimeModule).toHaveProperty('createYootChatRuntime');
    expect(runtimeModule).toHaveProperty('resolveYootChatPublicSupabaseKey');
    expect(runtimeModule).not.toHaveProperty('fetch');
  });
});
