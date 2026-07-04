import { useEvalRunsStore } from './eval-runs-store';
import { db } from '@/db';
import { emptyResult } from '@/types/eval';
import type { EvalRunRecord } from '@/types/eval';

function makeRecord(overrides: Partial<EvalRunRecord> = {}): EvalRunRecord {
  return {
    id: 'rec-1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    request: {
      messages: [{ role: 'user', content: 'Hello' }],
      systemPrompt: '',
      temperature: 1,
      maxTokens: 4096,
      topP: 1,
      topK: 0,
      frequencyPenalty: 0,
      presencePenalty: 0,
      stream: true,
      customHeaders: [],
    },
    runners: [
      {
        id: 'r1',
        providerId: 'p1',
        providerName: 'P',
        modelId: 'm1',
        label: 'P / m1',
      },
    ],
    results: [{ ...emptyResult('r1'), status: 'success', content: 'ok' }],
    judgeConfig: { enabled: false, runner: null, rubric: '' },
    judgeResult: null,
    ...overrides,
  };
}

describe('useEvalRunsStore', () => {
  beforeEach(async () => {
    useEvalRunsStore.setState({ records: [], collections: [], loaded: false });
    await db.evalRuns.clear();
    await db.evalCollections.clear();
  });

  it('saves a record and surfaces it through the store', async () => {
    const record = makeRecord();
    await useEvalRunsStore.getState().save(record);
    expect(useEvalRunsStore.getState().records).toHaveLength(1);
    const persisted = await db.evalRuns.get('rec-1');
    expect(persisted?.id).toBe('rec-1');
  });

  it('loads records sorted by createdAt desc', async () => {
    await useEvalRunsStore.getState().save(
      makeRecord({
        id: 'old',
        createdAt: new Date('2026-01-01T00:00:00Z'),
      }),
    );
    await useEvalRunsStore.getState().save(
      makeRecord({
        id: 'new',
        createdAt: new Date('2026-02-01T00:00:00Z'),
      }),
    );

    useEvalRunsStore.setState({ records: [], loaded: false });
    await useEvalRunsStore.getState().load();
    expect(useEvalRunsStore.getState().records.map((r) => r.id)).toEqual([
      'new',
      'old',
    ]);
  });

  it('renames a record (and clears name when blank)', async () => {
    await useEvalRunsStore.getState().save(makeRecord());
    await useEvalRunsStore.getState().rename('rec-1', '  My run  ');
    expect(useEvalRunsStore.getState().records[0].name).toBe('My run');
    await useEvalRunsStore.getState().rename('rec-1', '   ');
    expect(useEvalRunsStore.getState().records[0].name).toBeUndefined();
  });

  it('removes a record', async () => {
    await useEvalRunsStore.getState().save(makeRecord());
    await useEvalRunsStore.getState().remove('rec-1');
    expect(useEvalRunsStore.getState().records).toEqual([]);
    expect(await db.evalRuns.get('rec-1')).toBeUndefined();
  });

  it('clears all records', async () => {
    await useEvalRunsStore.getState().save(makeRecord({ id: 'a' }));
    await useEvalRunsStore.getState().save(makeRecord({ id: 'b' }));
    await useEvalRunsStore.getState().clearAll();
    expect(useEvalRunsStore.getState().records).toEqual([]);
  });

  it('creates, renames, and persists a collection', async () => {
    const collection = await useEvalRunsStore
      .getState()
      .addCollection('  Pricing  ');
    expect(collection.name).toBe('Pricing');
    expect(useEvalRunsStore.getState().collections).toHaveLength(1);
    expect(await db.evalCollections.get(collection.id)).toBeDefined();

    await useEvalRunsStore
      .getState()
      .renameCollection(collection.id, 'Pricing v2');
    expect(useEvalRunsStore.getState().collections[0].name).toBe('Pricing v2');
  });

  it('rejects blank collection names', async () => {
    await expect(
      useEvalRunsStore.getState().addCollection('   '),
    ).rejects.toThrow();
  });

  it('moves a run into and out of a collection', async () => {
    const collection = await useEvalRunsStore.getState().addCollection('Set A');
    await useEvalRunsStore.getState().save(makeRecord());

    await useEvalRunsStore.getState().moveRun('rec-1', collection.id);
    expect(useEvalRunsStore.getState().records[0].collectionId).toBe(
      collection.id,
    );
    expect((await db.evalRuns.get('rec-1'))?.collectionId).toBe(collection.id);

    await useEvalRunsStore.getState().moveRun('rec-1', null);
    expect(useEvalRunsStore.getState().records[0].collectionId).toBeUndefined();
    expect((await db.evalRuns.get('rec-1'))?.collectionId).toBeUndefined();
  });

  it('throws when moving to a non-existent collection', async () => {
    await useEvalRunsStore.getState().save(makeRecord());
    await expect(
      useEvalRunsStore.getState().moveRun('rec-1', 'missing'),
    ).rejects.toThrow();
  });

  it('cascades delete of a collection to its runs', async () => {
    const collection = await useEvalRunsStore.getState().addCollection('Set A');
    await useEvalRunsStore
      .getState()
      .save(makeRecord({ id: 'in', collectionId: collection.id }));
    await useEvalRunsStore.getState().save(makeRecord({ id: 'out' }));

    await useEvalRunsStore.getState().deleteCollection(collection.id);

    expect(useEvalRunsStore.getState().collections).toEqual([]);
    expect(useEvalRunsStore.getState().records.map((r) => r.id)).toEqual([
      'out',
    ]);
    expect(await db.evalRuns.get('in')).toBeUndefined();
    expect(await db.evalRuns.get('out')).toBeDefined();
  });

  it('loads records and collections together', async () => {
    const collection = await useEvalRunsStore.getState().addCollection('Set A');
    await useEvalRunsStore
      .getState()
      .save(makeRecord({ id: 'in', collectionId: collection.id }));

    useEvalRunsStore.setState({
      records: [],
      collections: [],
      loaded: false,
    });
    await useEvalRunsStore.getState().load();

    expect(useEvalRunsStore.getState().collections).toHaveLength(1);
    expect(useEvalRunsStore.getState().records[0].collectionId).toBe(
      collection.id,
    );
  });
});
