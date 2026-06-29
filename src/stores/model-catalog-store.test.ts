import { useModelCatalogStore } from './model-catalog-store';
import { makeModel } from '@/__tests__/fixtures';

const { mockFetchModels, mockClearCache } = vi.hoisted(() => ({
  mockFetchModels: vi.fn(),
  mockClearCache: vi.fn(),
}));

vi.mock('@/services/models-api', () => ({
  fetchModelsForProvider: mockFetchModels,
  clearModelsCache: mockClearCache,
}));

describe('model-catalog-store', () => {
  const getState = () => useModelCatalogStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    useModelCatalogStore.setState({
      models: {},
      status: 'idle',
      error: null,
      lastLoadedAt: null,
    });
  });

  it('loads models for each built-in provider', async () => {
    mockFetchModels.mockImplementation((name: string) =>
      Promise.resolve([makeModel({ id: `${name}-model` })]),
    );

    await getState().load();

    expect(getState().status).toBe('ready');
    expect(Object.keys(getState().models)).toEqual(
      expect.arrayContaining([
        'OpenAI',
        'Anthropic',
        'Google Gemini',
        'OpenRouter',
      ]),
    );
    expect(getState().models.OpenAI[0].id).toBe('OpenAI-model');
    expect(mockClearCache).not.toHaveBeenCalled();
  });

  it('records empty list when a single provider fails', async () => {
    mockFetchModels.mockImplementation((name: string) =>
      name === 'OpenAI'
        ? Promise.reject(new Error('boom'))
        : Promise.resolve([makeModel({ id: `${name}-model` })]),
    );

    await getState().load();

    expect(getState().status).toBe('ready');
    expect(getState().models.OpenAI).toEqual([]);
    expect(getState().models.Anthropic).toHaveLength(1);
  });

  it('is a no-op when already loading', async () => {
    useModelCatalogStore.setState({ status: 'loading' });
    await getState().load();
    expect(mockFetchModels).not.toHaveBeenCalled();
  });

  it('skips work when already ready and not forced', async () => {
    useModelCatalogStore.setState({ status: 'ready' });
    await getState().load();
    expect(mockFetchModels).not.toHaveBeenCalled();
  });

  it('clears the cache when forced', async () => {
    mockFetchModels.mockResolvedValue([]);
    useModelCatalogStore.setState({ status: 'ready' });

    await getState().load(true);

    expect(mockClearCache).toHaveBeenCalledTimes(1);
    expect(mockFetchModels).toHaveBeenCalled();
  });

  it('exposes models for a specific provider via getter', async () => {
    mockFetchModels.mockImplementation((name: string) =>
      Promise.resolve([makeModel({ id: `${name}-model` })]),
    );

    await getState().load();

    expect(getState().getModelsForProvider('Anthropic')).toHaveLength(1);
    expect(getState().getModelsForProvider('Unknown')).toEqual([]);
  });

  it('returns a stable empty list for missing providers', () => {
    const first = getState().getModelsForProvider('Unknown');
    const second = getState().getModelsForProvider('Unknown');

    expect(first).toBe(second);
  });
});
