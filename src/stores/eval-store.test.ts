import { useEvalStore, MAX_COMPARE_SELECTION } from './eval-store';
import { useProviderStore } from './provider-store';
import { useEnvironmentStore } from './environment-store';
import { emptyResult } from '@/types/eval';
import { makeProvider, makeModel } from '@/__tests__/fixtures';
import {
  DEFAULT_FREQUENCY_PENALTY,
  DEFAULT_MAX_TOKENS,
  DEFAULT_PRESENCE_PENALTY,
  DEFAULT_TEMPERATURE,
  DEFAULT_TOP_K,
  DEFAULT_TOP_P,
} from '@/constants/defaults';

const { mockRunEval, mockRunJudge } = vi.hoisted(() => ({
  mockRunEval: vi.fn(),
  mockRunJudge: vi.fn(),
}));

vi.mock('@/services/eval-runner', () => ({
  runEval: mockRunEval,
}));

vi.mock('@/services/judge-runner', () => ({
  runJudge: mockRunJudge,
  DEFAULT_JUDGE_RUBRIC: 'judge-rubric',
}));

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    providers: {
      toArray: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    environments: {
      toArray: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    settings: {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
    },
  },
}));
vi.mock('@/db', () => ({ db: mockDb }));
vi.mock('@/services/models-api', () => ({
  fetchModelsForProvider: vi.fn().mockResolvedValue([]),
}));

function resetEvalStore() {
  useEvalStore.getState().reset();
}

const provider = makeProvider({
  id: 'p1',
  models: [makeModel({ id: 'm1' }), makeModel({ id: 'm2' })],
});

describe('useEvalStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetEvalStore();
    useProviderStore.setState({
      providers: [provider],
      selectedProviderId: 'p1',
      selectedModelId: 'm1',
      loaded: true,
    });
    useEnvironmentStore.setState({
      environments: [],
      selectedEnvironmentId: null,
      loaded: true,
    });
  });

  it('adds and removes runners and prevents duplicates', () => {
    const { addRunner, removeRunner } = useEvalStore.getState();
    addRunner({ providerId: 'p1', modelId: 'm1' });
    addRunner({ providerId: 'p1', modelId: 'm1' });
    addRunner({ providerId: 'p1', modelId: 'm2' });
    expect(useEvalStore.getState().runners).toHaveLength(2);
    const firstId = useEvalStore.getState().runners[0].id;
    removeRunner(firstId);
    expect(useEvalStore.getState().runners).toHaveLength(1);
    expect(useEvalStore.getState().results[firstId]).toBeUndefined();
  });

  it('updates ratings and thumbs without losing other result fields', () => {
    useEvalStore.getState().addRunner({ providerId: 'p1', modelId: 'm1' });
    const runnerId = useEvalStore.getState().runners[0].id;
    useEvalStore.setState({
      results: {
        [runnerId]: { ...emptyResult(runnerId), content: 'hello' },
      },
    });
    useEvalStore.getState().setRating(runnerId, 4);
    useEvalStore.getState().setThumbs(runnerId, 'up');
    expect(useEvalStore.getState().results[runnerId].rating).toBe(4);
    expect(useEvalStore.getState().results[runnerId].thumbs).toBe('up');
    expect(useEvalStore.getState().results[runnerId].content).toBe('hello');
  });

  it('resets eval parameters without changing prompt content', () => {
    const state = useEvalStore.getState();
    state.setSystemPrompt('keep me');
    state.updateMessage(0, { content: 'Hello' });
    state.setCustomHeaders([{ id: 'h1', key: 'X-Test', value: '1' }]);
    state.setTemperature(0.2);
    state.setMaxTokens(123);
    state.setTopP(0.4);
    state.setTopK(40);
    state.setFrequencyPenalty(0.6);
    state.setPresencePenalty(0.7);
    state.setStream(false);

    useEvalStore.getState().resetParameters();

    const composer = useEvalStore.getState().composer;
    expect(composer.systemPrompt).toBe('keep me');
    expect(composer.messages[0].content).toBe('Hello');
    expect(composer.customHeaders).toEqual([
      { id: 'h1', key: 'X-Test', value: '1' },
    ]);
    expect(composer.temperature).toBe(DEFAULT_TEMPERATURE);
    expect(composer.maxTokens).toBe(DEFAULT_MAX_TOKENS);
    expect(composer.topP).toBe(DEFAULT_TOP_P);
    expect(composer.topK).toBe(DEFAULT_TOP_K);
    expect(composer.frequencyPenalty).toBe(DEFAULT_FREQUENCY_PENALTY);
    expect(composer.presencePenalty).toBe(DEFAULT_PRESENCE_PENALTY);
    expect(composer.stream).toBe(true);
  });

  it('toggles compare selection and enforces the max size', () => {
    const { addRunner, toggleCompare } = useEvalStore.getState();
    addRunner({ providerId: 'p1', modelId: 'm1' });
    addRunner({ providerId: 'p1', modelId: 'm2' });
    const [r1, r2] = useEvalStore.getState().runners;
    toggleCompare(r1.id);
    toggleCompare(r2.id);
    expect(useEvalStore.getState().compareSelection).toEqual([r1.id, r2.id]);
    // Adding a third evicts the oldest.
    useEvalStore.getState().addRunner({ providerId: 'p1', modelId: 'gpt-4' });
    const r3 = useEvalStore.getState().runners[2];
    toggleCompare(r3.id);
    const selection = useEvalStore.getState().compareSelection;
    expect(selection).toHaveLength(MAX_COMPARE_SELECTION);
    expect(selection[selection.length - 1]).toBe(r3.id);
    // Toggling off removes from selection.
    toggleCompare(r3.id);
    expect(useEvalStore.getState().compareSelection).not.toContain(r3.id);
  });

  it('refuses to start when there are no runners', async () => {
    await useEvalStore.getState().start();
    expect(useEvalStore.getState().error).toMatch(/runner/i);
    expect(useEvalStore.getState().isRunning).toBe(false);
    expect(mockRunEval).not.toHaveBeenCalled();
  });

  it('refuses to start when there are no non-empty messages', async () => {
    useEvalStore.getState().addRunner({ providerId: 'p1', modelId: 'm1' });
    await useEvalStore.getState().start();
    expect(useEvalStore.getState().error).toMatch(/message/i);
    expect(mockRunEval).not.toHaveBeenCalled();
  });

  it('runs the eval and writes per-runner updates into state', async () => {
    useEvalStore.getState().addRunner({ providerId: 'p1', modelId: 'm1' });
    useEvalStore.getState().updateMessage(0, { content: 'Hello' });
    const runnerId = useEvalStore.getState().runners[0].id;
    let resolveRun: ((results: never[]) => void) | null = null;
    const runPromise = new Promise<never[]>((resolve) => {
      resolveRun = resolve;
    });
    mockRunEval.mockImplementation(({ onUpdate, runners }) => {
      const r = runners[0];
      onUpdate({
        runnerId: r.id,
        result: {
          ...emptyResult(r.id),
          status: 'streaming',
          content: 'partial',
        },
      });
      return { promise: runPromise, cancel: vi.fn() };
    });

    const start = useEvalStore.getState().start();
    // Wait for microtask queue so onUpdate completes
    await Promise.resolve();
    expect(useEvalStore.getState().results[runnerId].status).toBe('streaming');
    expect(useEvalStore.getState().isRunning).toBe(true);

    resolveRun!([]);
    await start;
    expect(useEvalStore.getState().isRunning).toBe(false);
  });

  it('calls the judge after eval when judge is enabled', async () => {
    useEvalStore.getState().addRunner({ providerId: 'p1', modelId: 'm1' });
    useEvalStore.getState().updateMessage(0, { content: 'Hello' });
    useEvalStore.getState().setJudgeEnabled(true);
    useEvalStore.getState().setJudgeRunner({ providerId: 'p1', modelId: 'm1' });
    const runnerId = useEvalStore.getState().runners[0].id;

    mockRunEval.mockReturnValue({
      promise: Promise.resolve([
        { ...emptyResult(runnerId), status: 'success', content: 'ok' },
      ]),
      cancel: vi.fn(),
    });
    mockRunJudge.mockReturnValue({
      promise: Promise.resolve({
        scores: {},
        winnerRunnerId: null,
        rawContent: '',
        error: null,
      }),
      cancel: vi.fn(),
    });

    await useEvalStore.getState().start();
    expect(mockRunJudge).toHaveBeenCalledTimes(1);
    expect(useEvalStore.getState().judgeResult).not.toBeNull();
    expect(useEvalStore.getState().isJudging).toBe(false);
  });

  it('cancelAll cancels both run and judge handles', () => {
    const cancelRun = vi.fn();
    const cancelJudge = vi.fn();
    useEvalStore.setState({
      _runHandle: { cancel: cancelRun },
      _judgeHandle: { cancel: cancelJudge },
    });
    useEvalStore.getState().cancelAll();
    expect(cancelRun).toHaveBeenCalled();
    expect(cancelJudge).toHaveBeenCalled();
  });

  it('loadRun restores composer, runners, results, and judge result', () => {
    useEvalStore.getState().loadRun({
      id: 'rec-1',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      name: 'My run',
      request: {
        messages: [{ role: 'user', content: 'Hi' }],
        systemPrompt: 'sys',
        temperature: 0.5,
        maxTokens: 512,
        topP: 0.9,
        topK: 40,
        frequencyPenalty: 0.1,
        presencePenalty: 0.2,
        stream: false,
        customHeaders: [{ key: 'X-Test', value: '1' }],
      },
      runners: [
        {
          id: 'r1',
          providerId: 'p1',
          providerName: 'TestProvider',
          modelId: 'm1',
          label: 'TestProvider / m1',
        },
      ],
      results: [{ ...emptyResult('r1'), status: 'success', content: 'done' }],
      judgeConfig: { enabled: false, runner: null, rubric: '' },
      judgeResult: null,
    });
    const state = useEvalStore.getState();
    expect(state.composer.systemPrompt).toBe('sys');
    expect(state.composer.messages[0].content).toBe('Hi');
    expect(state.composer.temperature).toBe(0.5);
    expect(state.composer.stream).toBe(false);
    expect(state.runners).toHaveLength(1);
    expect(state.results.r1.status).toBe('success');
    expect(state.lastSavedRecordId).toBe('rec-1');
  });

  it('buildRecord captures the current state into a saveable shape', () => {
    useEvalStore.getState().setSystemPrompt('sys');
    useEvalStore.getState().updateMessage(0, { content: 'Hello' });
    useEvalStore.getState().addRunner({ providerId: 'p1', modelId: 'm1' });
    const runnerId = useEvalStore.getState().runners[0].id;
    useEvalStore.setState({
      results: {
        [runnerId]: {
          ...emptyResult(runnerId),
          status: 'success',
          content: 'ok',
        },
      },
    });
    const record = useEvalStore.getState().buildRecord('snapshot');
    expect(record.name).toBe('snapshot');
    expect(record.request.systemPrompt).toBe('sys');
    expect(record.request.messages[0].content).toBe('Hello');
    expect(record.runners).toHaveLength(1);
    expect(record.results[0].status).toBe('success');
  });
});
