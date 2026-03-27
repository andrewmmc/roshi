import { useProviderStore } from './provider-store';
import { makeProvider, makeModel } from '@/__tests__/fixtures';

const { mockDb, mockFetchModels, nanoidCount } = vi.hoisted(() => {
  const mockDb = {
    providers: {
      toArray: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
  };
  const mockFetchModels = vi.fn().mockResolvedValue([]);
  const nanoidCount = { value: 0 };
  return { mockDb, mockFetchModels, nanoidCount };
});

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => `prov-id-${++nanoidCount.value}`),
}));

vi.mock('@/db', () => ({ db: mockDb }));
vi.mock('@/services/models-api', () => ({
  fetchModelsForProvider: mockFetchModels,
}));

describe('provider-store', () => {
  const getState = () => useProviderStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    nanoidCount.value = 0;
    localStorage.clear();
    useProviderStore.setState({
      providers: [],
      selectedProviderId: null,
      selectedModelId: null,
      loaded: false,
    });
    mockFetchModels.mockResolvedValue([]);
    mockDb.providers.toArray.mockResolvedValue([]);
  });

  describe('load', () => {
    it('is idempotent — does not run when already loaded', async () => {
      useProviderStore.setState({ loaded: true });
      await getState().load();
      expect(mockDb.providers.toArray).not.toHaveBeenCalled();
    });

    it('seeds builtin providers on first load', async () => {
      const mockModels = [makeModel({ id: 'gpt-4' })];
      mockFetchModels.mockResolvedValue(mockModels);

      await getState().load();

      expect(getState().providers).toHaveLength(2); // OpenAI + OpenRouter
      expect(getState().providers[0].name).toBe('OpenAI');
      expect(getState().providers[0].isBuiltIn).toBe(true);
      expect(getState().providers[0].models).toEqual(mockModels);
      expect(mockDb.providers.add).toHaveBeenCalledTimes(2);
    });

    it('skips seeding for existing builtins', async () => {
      const existingProvider = makeProvider({
        id: 'existing-openai',
        name: 'OpenAI',
        isBuiltIn: true,
        models: [makeModel()],
      });
      mockDb.providers.toArray.mockResolvedValue([existingProvider]);

      await getState().load();

      // Only OpenRouter should be seeded (OpenAI already exists)
      expect(mockDb.providers.add).toHaveBeenCalledTimes(1);
      expect(getState().providers).toHaveLength(2);
    });

    it('seeds with empty models on fetch failure', async () => {
      mockFetchModels.mockRejectedValue(new Error('Network error'));

      await getState().load();

      expect(getState().providers).toHaveLength(2);
      expect(getState().providers[0].models).toEqual([]);
    });

    it('restores valid selection from localStorage', async () => {
      const existingProvider = makeProvider({
        id: 'p1',
        name: 'OpenAI',
        isBuiltIn: true,
        models: [makeModel({ id: 'gpt-4' })],
      });
      mockDb.providers.toArray.mockResolvedValue([existingProvider]);
      localStorage.setItem('llm-tester-selection', JSON.stringify({ providerId: 'p1', modelId: 'gpt-4' }));

      await getState().load();

      expect(getState().selectedProviderId).toBe('p1');
      expect(getState().selectedModelId).toBe('gpt-4');
    });

    it('falls back to first provider when saved selection is invalid', async () => {
      localStorage.setItem('llm-tester-selection', JSON.stringify({ providerId: 'nonexistent', modelId: 'x' }));
      mockFetchModels.mockResolvedValue([makeModel({ id: 'm1' })]);

      await getState().load();

      expect(getState().selectedProviderId).toBe(getState().providers[0].id);
      expect(getState().selectedModelId).toBe('m1');
    });

    it('selects first provider when no saved selection', async () => {
      mockFetchModels.mockResolvedValue([makeModel({ id: 'm1' })]);
      await getState().load();

      expect(getState().selectedProviderId).toBeTruthy();
      expect(getState().selectedModelId).toBe('m1');
    });
  });

  describe('addProvider', () => {
    it('adds provider to DB and state', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [makeProvider({ id: 'existing' })],
        selectedProviderId: 'existing',
        selectedModelId: 'gpt-4',
      });

      const result = await getState().addProvider({
        name: 'Custom',
        type: 'custom',
        baseUrl: 'https://custom.api',
        auth: { type: 'bearer' },
        apiKey: 'key',
        endpoints: { chat: '/chat' },
        models: [makeModel({ id: 'custom-model' })],
        isBuiltIn: false,
      });

      expect(result.id).toBeTruthy();
      expect(mockDb.providers.add).toHaveBeenCalledWith(result);
      expect(getState().providers).toHaveLength(2);
      // Should not change selection since one already exists
      expect(getState().selectedProviderId).toBe('existing');
    });

    it('auto-selects if no provider was selected', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [],
        selectedProviderId: null,
        selectedModelId: null,
      });

      await getState().addProvider({
        name: 'New',
        type: 'custom',
        baseUrl: 'https://new.api',
        auth: { type: 'none' },
        apiKey: '',
        endpoints: { chat: '/chat' },
        models: [makeModel({ id: 'new-model' })],
        isBuiltIn: false,
      });

      expect(getState().selectedProviderId).toBeTruthy();
      expect(getState().selectedModelId).toBe('new-model');
    });
  });

  describe('updateProvider', () => {
    it('updates DB and state', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [makeProvider({ id: 'p1', name: 'Old' })],
      });

      await getState().updateProvider('p1', { name: 'Updated' });

      expect(mockDb.providers.update).toHaveBeenCalledWith('p1', { name: 'Updated' });
      expect(getState().providers[0].name).toBe('Updated');
    });
  });

  describe('deleteProvider', () => {
    it('prevents deletion of built-in providers', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [makeProvider({ id: 'p1', isBuiltIn: true })],
      });

      await getState().deleteProvider('p1');

      expect(mockDb.providers.delete).not.toHaveBeenCalled();
      expect(getState().providers).toHaveLength(1);
    });

    it('deletes custom provider from DB and state', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [
          makeProvider({ id: 'p1', isBuiltIn: false }),
          makeProvider({ id: 'p2', isBuiltIn: false }),
        ],
        selectedProviderId: 'p2',
        selectedModelId: 'gpt-4',
      });

      await getState().deleteProvider('p1');

      expect(mockDb.providers.delete).toHaveBeenCalledWith('p1');
      expect(getState().providers).toHaveLength(1);
      expect(getState().selectedProviderId).toBe('p2');
    });

    it('updates selection when deleting selected provider', async () => {
      const remaining = makeProvider({ id: 'p2', models: [makeModel({ id: 'm2' })] });
      useProviderStore.setState({
        loaded: true,
        providers: [makeProvider({ id: 'p1', isBuiltIn: false }), remaining],
        selectedProviderId: 'p1',
        selectedModelId: 'gpt-4',
      });

      await getState().deleteProvider('p1');

      expect(getState().selectedProviderId).toBe('p2');
      expect(getState().selectedModelId).toBe('m2');
    });
  });

  describe('selectProvider', () => {
    it('updates selection and persists to localStorage', () => {
      useProviderStore.setState({
        loaded: true,
        providers: [
          makeProvider({ id: 'p1', models: [makeModel({ id: 'm1' })] }),
          makeProvider({ id: 'p2', models: [makeModel({ id: 'm2' })] }),
        ],
        selectedProviderId: 'p1',
      });

      getState().selectProvider('p2');

      expect(getState().selectedProviderId).toBe('p2');
      expect(getState().selectedModelId).toBe('m2');
      const saved = JSON.parse(localStorage.getItem('llm-tester-selection')!);
      expect(saved.providerId).toBe('p2');
    });
  });

  describe('selectModel', () => {
    it('updates model selection and persists', () => {
      useProviderStore.setState({
        loaded: true,
        providers: [makeProvider({ id: 'p1', models: [makeModel({ id: 'm1' }), makeModel({ id: 'm2' })] })],
        selectedProviderId: 'p1',
        selectedModelId: 'm1',
      });

      getState().selectModel('m2');

      expect(getState().selectedModelId).toBe('m2');
      const saved = JSON.parse(localStorage.getItem('llm-tester-selection')!);
      expect(saved.modelId).toBe('m2');
    });
  });

  describe('resetProvider', () => {
    it('skips non-built-in providers', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [makeProvider({ id: 'p1', isBuiltIn: false })],
      });

      await getState().resetProvider('p1');

      expect(mockFetchModels).not.toHaveBeenCalled();
      expect(mockDb.providers.put).not.toHaveBeenCalled();
    });

    it('resets built-in provider with fresh models', async () => {
      const freshModels = [makeModel({ id: 'fresh-model' })];
      mockFetchModels.mockResolvedValue(freshModels);

      useProviderStore.setState({
        loaded: true,
        providers: [makeProvider({ id: 'p1', name: 'OpenAI', isBuiltIn: true, apiKey: 'old-key' })],
      });

      await getState().resetProvider('p1');

      expect(mockDb.providers.put).toHaveBeenCalled();
      expect(getState().providers[0].apiKey).toBe('');
      expect(getState().providers[0].models).toEqual(freshModels);
    });

    it('uses empty models on fetch failure', async () => {
      mockFetchModels.mockRejectedValue(new Error('fail'));

      useProviderStore.setState({
        loaded: true,
        providers: [makeProvider({ id: 'p1', name: 'OpenAI', isBuiltIn: true })],
      });

      await getState().resetProvider('p1');

      expect(getState().providers[0].models).toEqual([]);
    });
  });

  describe('resetAllProviders', () => {
    it('removes all providers and re-seeds only builtins', async () => {
      const freshModels = [makeModel({ id: 'new-model' })];
      mockFetchModels.mockResolvedValue(freshModels);

      useProviderStore.setState({
        loaded: true,
        providers: [
          makeProvider({ id: 'old-openai', name: 'OpenAI', isBuiltIn: true }),
          makeProvider({ id: 'old-router', name: 'OpenRouter', isBuiltIn: true }),
          makeProvider({ id: 'custom', name: 'Custom', isBuiltIn: false }),
        ],
      });

      await getState().resetAllProviders();

      expect(mockDb.providers.clear).toHaveBeenCalled();
      expect(mockDb.providers.add).toHaveBeenCalledTimes(2);
      expect(getState().providers.some((p) => p.id === 'custom')).toBe(false);
      expect(getState().providers).toHaveLength(2);
      expect(getState().providers[0].models).toEqual(freshModels);
    });
  });

  describe('getSelectedProvider', () => {
    it('returns selected provider', () => {
      const provider = makeProvider({ id: 'p1' });
      useProviderStore.setState({
        providers: [provider],
        selectedProviderId: 'p1',
      });

      expect(getState().getSelectedProvider()).toEqual(provider);
    });

    it('returns null when none selected', () => {
      useProviderStore.setState({ selectedProviderId: null });
      expect(getState().getSelectedProvider()).toBeNull();
    });
  });

  describe('getSelectedModel', () => {
    it('returns selected model from selected provider', () => {
      const model = makeModel({ id: 'm1' });
      const provider = makeProvider({ id: 'p1', models: [model] });
      useProviderStore.setState({
        providers: [provider],
        selectedProviderId: 'p1',
        selectedModelId: 'm1',
      });

      expect(getState().getSelectedModel()).toEqual(model);
    });

    it('returns null when no model selected', () => {
      useProviderStore.setState({
        providers: [makeProvider({ id: 'p1' })],
        selectedProviderId: 'p1',
        selectedModelId: null,
      });

      expect(getState().getSelectedModel()).toBeNull();
    });
  });
});
