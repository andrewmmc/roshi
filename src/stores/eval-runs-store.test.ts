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
    useEvalRunsStore.setState({ records: [], loaded: false });
    await db.evalRuns.clear();
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
});
