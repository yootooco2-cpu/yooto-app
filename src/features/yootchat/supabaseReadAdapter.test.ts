import {
  YOOTCHAT_SUPABASE_DEFAULT_LIMIT,
  YOOTCHAT_SUPABASE_FORBIDDEN_OPERATIONS,
  YOOTCHAT_SUPABASE_MAX_LIMIT,
  YOOTCHAT_SUPABASE_MERCHANT_SELECT,
  YOOTCHAT_SUPABASE_PERSONAL_COLUMNS,
  createYootChatSupabaseReadAdapter,
  runYootChatWithMerchantReadPort,
  type ReadOnlySupabaseClient,
  type YootChatReadObservation,
} from './index';

type Operation = readonly [string, ...unknown[]];
type QueryResponse = { readonly data: unknown; readonly error: null | { readonly code?: string; readonly message?: string; readonly name?: string } };

class FakeBuilder implements PromiseLike<QueryResponse> {
  readonly operations: Operation[];

  constructor(
    private readonly response: QueryResponse | Error,
    operations: Operation[],
  ) {
    this.operations = operations;
  }

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

const validRow = (overrides: Record<string, unknown> = {}) => ({
  id: 101,
  name: 'Boulangerie du Centre',
  status: 'active',
  is_active: true,
  city: 'Quissac',
  latitude: 43.91,
  longitude: 4.0,
  google_rating: 4.5,
  category: 'Boulangerie',
  opening_hours: { open_now: true },
  is_accessible: null,
  est_ess: null,
  est_bio: true,
  artisan_rm: null,
  est_societe_mission: null,
  ...overrides,
});

const adapterFor = (response: QueryResponse | Error, events: YootChatReadObservation[] = []) => {
  const client = new FakeClient(response);
  const adapter = createYootChatSupabaseReadAdapter({
    client,
    observer: (event) => events.push(event),
    now: () => 0,
    createAbortSignal: () => new AbortController().signal,
  });
  return { adapter, client, events };
};

describe('YootChat Supabase read adapter Lot 4', () => {
  test('reads valid active rows and projects SourceMerchantRecord candidates', async () => {
    const { adapter } = adapterFor({ data: [validRow()], error: null });
    const result = await adapter.read();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records).toHaveLength(1);
    expect(result.records[0].officialCommitments).toEqual(['Agriculture biologique']);
    expect(result.candidates[0].facts.services).toEqual([]);
    expect(result.candidates[0].facts.equipment).toEqual([]);
  });

  test('excludes pending rows returned despite the server filter', async () => {
    const { adapter } = adapterFor({ data: [validRow({ status: 'pending' })], error: null });
    const result = await adapter.read();

    expect(result.ok).toBe(false);
    expect(result.quarantined[0]).toEqual({ id: '101', reason: 'NON_PUBLISHABLE_STATUS' });
  });

  test('excludes inactive rows returned despite the server filter', async () => {
    const { adapter } = adapterFor({ data: [validRow({ is_active: false })], error: null });
    const result = await adapter.read();

    expect(result.ok).toBe(false);
    expect(result.quarantined[0]).toEqual({ id: '101', reason: 'INVALID_ACTIVE_FLAG' });
  });

  test('excludes unknown statuses', async () => {
    const { adapter } = adapterFor({ data: [validRow({ status: 'archived' })], error: null });
    const result = await adapter.read();

    expect(result.ok).toBe(false);
    expect(result.quarantined[0].reason).toBe('NON_PUBLISHABLE_STATUS');
  });

  test('uses the default limit', async () => {
    const { adapter, client } = adapterFor({ data: [validRow()], error: null });
    await adapter.read();

    expect(client.operations).toContainEqual(['limit', YOOTCHAT_SUPABASE_DEFAULT_LIMIT]);
  });

  test('accepts the maximum limit', async () => {
    const { adapter, client } = adapterFor({ data: [validRow()], error: null });
    await adapter.read({ filters: { limit: YOOTCHAT_SUPABASE_MAX_LIMIT } });

    expect(client.operations).toContainEqual(['limit', YOOTCHAT_SUPABASE_MAX_LIMIT]);
  });

  test('refuses a limit above the maximum before querying', async () => {
    const { adapter, client } = adapterFor({ data: [validRow()], error: null });
    const result = await adapter.read({ filters: { limit: YOOTCHAT_SUPABASE_MAX_LIMIT + 1 } });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.code).toBe('LIMIT_OUT_OF_RANGE');
    expect(client.operations).toEqual([]);
  });

  test('uses an explicit column projection', async () => {
    const { adapter, client } = adapterFor({ data: [validRow()], error: null });
    await adapter.read();

    expect(client.operations).toContainEqual(['select', YOOTCHAT_SUPABASE_MERCHANT_SELECT]);
  });

  test('never uses select star', async () => {
    expect(YOOTCHAT_SUPABASE_MERCHANT_SELECT).not.toContain('*');
  });

  test('does not call write-capable operations', async () => {
    const { adapter, client } = adapterFor({ data: [validRow()], error: null });
    await adapter.read();

    const operationNames = client.operations.map(([name]) => name);
    for (const forbidden of YOOTCHAT_SUPABASE_FORBIDDEN_OPERATIONS) {
      expect(operationNames).not.toContain(forbidden);
    }
  });

  test('quarantines a row with an unknown property', async () => {
    const { adapter } = adapterFor({ data: [validRow({ unknown_private_note: 'x' })], error: null });
    const result = await adapter.read();

    expect(result.ok).toBe(false);
    expect(result.quarantined[0].reason).toBe('UNKNOWN_PROPERTY');
  });

  test('quarantines invalid ids', async () => {
    const { adapter } = adapterFor({ data: [validRow({ id: '' })], error: null });
    const result = await adapter.read();

    expect(result.ok).toBe(false);
    expect(result.quarantined[0].reason).toBe('INVALID_ID');
  });

  test('quarantines invalid coordinates', async () => {
    const { adapter } = adapterFor({ data: [validRow({ latitude: 200 })], error: null });
    const result = await adapter.read();

    expect(result.ok).toBe(false);
    expect(result.quarantined[0].reason).toBe('INVALID_COORDINATES');
  });

  test('quarantines invalid ratings', async () => {
    const { adapter } = adapterFor({ data: [validRow({ google_rating: 9 })], error: null });
    const result = await adapter.read();

    expect(result.ok).toBe(false);
    expect(result.quarantined[0].reason).toBe('INVALID_RATING');
  });

  test('rejects non-structured service data as an unknown projected property', async () => {
    const { adapter } = adapterFor({ data: [validRow({ services: 'delivery' })], error: null });
    const result = await adapter.read();

    expect(result.ok).toBe(false);
    expect(result.quarantined[0].reason).toBe('UNKNOWN_PROPERTY');
  });

  test('keeps accessibility unknown unless positively structured', async () => {
    const { adapter } = adapterFor({ data: [validRow({ is_accessible: false })], error: null });
    const result = await adapter.read();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records[0].accessibility).toBe('UNKNOWN');
  });

  test('quarantines an official commitment without official boolean proof', async () => {
    const { adapter } = adapterFor({ data: [validRow({ est_ess: 'yes' })], error: null });
    const result = await adapter.read();

    expect(result.ok).toBe(false);
    expect(result.quarantined[0].reason).toBe('INVALID_OFFICIAL_COMMITMENT');
  });

  test('quarantines duplicated identifiers', async () => {
    const { adapter } = adapterFor({ data: [validRow(), validRow()], error: null });
    const result = await adapter.read();

    expect(result.ok).toBe(true);
    expect(result.quarantined).toContainEqual({ id: '101', reason: 'DUPLICATE_ID' });
  });

  test('returns a timeout fallback', async () => {
    const { adapter } = adapterFor(Object.assign(new Error('aborted'), { name: 'AbortError' }));
    const result = await adapter.read();

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.code).toBe('SUPABASE_TIMEOUT');
    expect(result.ok ? null : result.fallback.message.template).toBe('SERVICE_UNAVAILABLE');
  });

  test('returns a network fallback', async () => {
    const { adapter } = adapterFor(new Error('network'));
    const result = await adapter.read();

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.code).toBe('SUPABASE_NETWORK_ERROR');
  });

  test('returns an RLS fallback', async () => {
    const { adapter } = adapterFor({ data: null, error: { code: '42501', message: 'permission denied' } });
    const result = await adapter.read();

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.code).toBe('SUPABASE_RLS_DENIED');
  });

  test('returns a malformed response fallback', async () => {
    const { adapter } = adapterFor({ data: { id: 1 }, error: null });
    const result = await adapter.read();

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.code).toBe('MALFORMED_RESPONSE');
  });

  test('returns an empty active rows fallback', async () => {
    const { adapter } = adapterFor({ data: [], error: null });
    const result = await adapter.read();

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.code).toBe('NO_ACTIVE_ROWS');
  });

  test('allows partial quarantine below the invalid threshold', async () => {
    const { adapter } = adapterFor({ data: [validRow({ id: 101 }), validRow({ id: 102 }), validRow({ id: 103, google_rating: 8 })], error: null });
    const result = await adapter.read();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.acceptedCount).toBe(2);
    expect(result.quarantined).toHaveLength(1);
  });

  test('fails when too many rows are invalid', async () => {
    const { adapter } = adapterFor({ data: [validRow({ id: 101, google_rating: 8 }), validRow({ id: 102, latitude: 200 }), validRow({ id: 103 })], error: null });
    const result = await adapter.read();

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.code).toBe('TOO_MANY_INVALID_ROWS');
  });

  test('does not log personal data, keys or full user text', async () => {
    const events: YootChatReadObservation[] = [];
    const { adapter } = adapterFor({ data: [validRow({ id: 101 }), validRow({ id: 102, email: 'secret@example.com' })], error: null }, events);
    await adapter.read();

    const serialized = JSON.stringify(events);
    expect(serialized).not.toContain('secret@example.com');
    expect(serialized).not.toContain('apikey');
    expect(serialized).not.toContain('Bearer');
    for (const personal of YOOTCHAT_SUPABASE_PERSONAL_COLUMNS) {
      expect(serialized).not.toContain(personal);
    }
  });

  test('integrates with the deterministic engine', async () => {
    const { adapter } = adapterFor({ data: [validRow()], error: null });
    const result = await runYootChatWithMerchantReadPort(adapter, {
      message: 'Une boulangerie locale',
      language: 'fr',
      city: 'Quissac',
    });

    expect(result.read.ok).toBe(true);
    expect(result.engine.ok).toBe(true);
    expect(result.engine.response.recommendations).toHaveLength(1);
  });

  test('returns identical outputs for identical inputs', async () => {
    const response = { data: [validRow({ id: 102 }), validRow({ id: 101 })], error: null };
    const first = await adapterFor(response).adapter.read({ filters: { city: 'Quissac' } });
    const second = await adapterFor(response).adapter.read({ filters: { city: 'Quissac' } });

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  test('applies bounded structured filters without accepting arbitrary SQL fragments', async () => {
    const { adapter, client } = adapterFor({ data: [validRow()], error: null });
    await adapter.read({
      filters: {
        city: 'Quissac',
        categoryIds: ['Boulangerie'],
        allowedMerchantIds: ['101'],
        origin: { latitude: 43.91, longitude: 4, radiusKm: 2 },
      },
    });

    expect(client.operations).toContainEqual(['eq', 'city', 'Quissac']);
    expect(client.operations).toContainEqual(['in', 'category', ['Boulangerie']]);
    expect(client.operations).toContainEqual(['in', 'id', ['101']]);
    expect(client.operations.some(([name]) => name === 'or')).toBe(false);
  });

  test('refuses unusable locations before querying', async () => {
    const { adapter, client } = adapterFor({ data: [validRow()], error: null });
    const result = await adapter.read({ filters: { origin: { latitude: 120, longitude: 4, radiusKm: 2 } } });

    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.code).toBe('LOCATION_UNUSABLE');
    expect(client.operations).toEqual([]);
  });

  test('attaches an abort signal when the transport supports cancellation', async () => {
    const { adapter, client } = adapterFor({ data: [validRow()], error: null });
    await adapter.read();

    expect(client.operations.some(([name]) => name === 'abortSignal')).toBe(true);
  });
});
