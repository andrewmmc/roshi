import { useProviderStore } from './provider-store';
import { MAX_CUSTOM_PROVIDERS } from '@/constants/providers';
import { makeProvider, makeModel } from '@/__tests__/fixtures';

const { mockDb, mockFetchModels, nanoidCount } = vi.hoisted(() => {
  const settingsStore = new Map<string, unknown>();
  const mockDb = {
    providers: {
      toArray: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
    settings: {
      get: vi.fn(async (key: string) => {
        const val = settingsStore.get(key);
        return val ? { key, value: val } : undefined;
      }),
      put: vi.fn(async (entry: { key: string; value: unknown }) => {
        settingsStore.set(entry.key, entry.value);
      }),
      _store: settingsStore,
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
  clearModelsCache: vi.fn(),
}));

describe('provider-store', () => {
  const getState = () => useProviderStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    nanoidCount.value = 0;
    localStorage.clear();
    mockDb.settings._store.clear();
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

      expect(getState().providers).toHaveLength(4); // OpenAI + Anthropic + Gemini + OpenRouter
      expect(getState().providers[0].name).toBe('OpenAI');
      expect(getState().providers[0].isBuiltIn).toBe(true);
      expect(getState().providers[0].models).toEqual(mockModels);
      expect(mockFetchModels).toHaveBeenCalledWith('Google Gemini');
      expect(
        getState().providers.find((p) => p.name === 'Google Gemini')?.models,
      ).toEqual(mockModels);
      expect(mockDb.providers.add).toHaveBeenCalledTimes(4);
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

      // Anthropic + Gemini + OpenRouter should be seeded (OpenAI already exists)
      expect(mockDb.providers.add).toHaveBeenCalledTimes(3);
      expect(getState().providers).toHaveLength(4);
    });

    it('seeds with empty models on fetch failure', async () => {
      mockFetchModels.mockRejectedValue(new Error('Network error'));

      await getState().load();

      expect(getState().providers).toHaveLength(4);
      expect(getState().providers[0].models).toEqual([]);
    });

    it('keeps partial built-in model fetch successes when seeding', async () => {
      const openAiModels = [makeModel({ id: 'gpt-4' })];
      mockFetchModels.mockImplementation((name: string) =>
        name === 'OpenAI'
          ? Promise.resolve(openAiModels)
          : Promise.reject(new Error('network')),
      );

      await getState().load();

      expect(
        getState().providers.find((p) => p.name === 'OpenAI')?.models,
      ).toEqual(openAiModels);
      expect(
        getState().providers.find((p) => p.name === 'Anthropic')?.models,
      ).toEqual([]);
    });

    it('does not mark loaded when provider load fails', async () => {
      mockDb.providers.toArray.mockRejectedValueOnce(new Error('db failed'));

      await expect(getState().load()).rejects.toThrow('db failed');

      expect(getState().loaded).toBe(false);
    });

    it('restores valid selection from IndexedDB settings', async () => {
      const existingProvider = makeProvider({
        id: 'p1',
        name: 'OpenAI',
        isBuiltIn: true,
        models: [makeModel({ id: 'gpt-4' })],
      });
      mockDb.providers.toArray.mockResolvedValue([existingProvider]);
      mockDb.settings._store.set('provider-selection', {
        providerId: 'p1',
        modelId: 'gpt-4',
      });

      await getState().load();

      expect(getState().selectedProviderId).toBe('p1');
      expect(getState().selectedModelId).toBe('gpt-4');
    });

    it('migrates stored legacy custom type to openai-compatible', async () => {
      const legacyRow = {
        ...makeProvider({
          id: 'legacy-custom',
          name: 'My API',
          isBuiltIn: false,
        }),
        type: 'custom',
      };
      mockDb.providers.toArray.mockResolvedValue([legacyRow as never]);

      await getState().load();

      expect(mockDb.providers.update).toHaveBeenCalledWith('legacy-custom', {
        type: 'openai-compatible',
      });
      const migrated = getState().providers.find(
        (p) => p.id === 'legacy-custom',
      );
      expect(migrated?.type).toBe('openai-compatible');
      expect(migrated?.protocol).toBe('openai-compatible-chat');
      expect(migrated?.endpoints.responses).toBe('/responses');
      expect(migrated?.models[0].source).toBe('manual');
    });

    it('normalizes loaded providers without protocol metadata', async () => {
      const provider = makeProvider({
        id: 'old-openai',
        name: 'OpenAI',
        protocol: undefined,
        endpoints: { chat: '/chat/completions' },
      });
      mockDb.providers.toArray.mockResolvedValue([provider]);

      await getState().load();

      const loaded = getState().providers.find((p) => p.id === 'old-openai');
      expect(loaded?.protocol).toBe('openai-chat-completions');
      expect(loaded?.endpoints.responses).toBe('/responses');
      expect(mockDb.providers.put).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'old-openai',
          protocol: 'openai-chat-completions',
          endpoints: expect.objectContaining({ responses: '/responses' }),
        }),
      );
    });

    it('does not rewrite already-normalized providers on load', async () => {
      const provider = makeProvider({ id: 'p1' });
      mockDb.providers.toArray.mockResolvedValue([provider]);

      await getState().load();

      expect(mockDb.providers.put).not.toHaveBeenCalled();
    });

    it('migrates selection from legacy localStorage to IndexedDB', async () => {
      const existingProvider = makeProvider({
        id: 'p1',
        name: 'OpenAI',
        isBuiltIn: true,
        models: [makeModel({ id: 'gpt-4' })],
      });
      mockDb.providers.toArray.mockResolvedValue([existingProvider]);
      localStorage.setItem(
        'llm-tester-selection',
        JSON.stringify({ providerId: 'p1', modelId: 'gpt-4' }),
      );

      await getState().load();

      expect(getState().selectedProviderId).toBe('p1');
      expect(getState().selectedModelId).toBe('gpt-4');
      expect(localStorage.getItem('llm-tester-selection')).toBeNull();
      expect(mockDb.settings._store.get('provider-selection')).toEqual({
        providerId: 'p1',
        modelId: 'gpt-4',
      });
    });

    it('ignores invalid saved selection data', async () => {
      const existingProvider = makeProvider({
        id: 'p1',
        name: 'OpenAI',
        isBuiltIn: true,
        models: [makeModel({ id: 'gpt-4' })],
      });
      mockDb.providers.toArray.mockResolvedValue([existingProvider]);
      mockDb.settings.get.mockRejectedValueOnce(new Error('db unavailable'));

      await getState().load();

      expect(getState().selectedProviderId).toBe('p1');
      expect(getState().selectedModelId).toBe('gpt-4');
    });

    it('falls back to first provider when saved selection is invalid', async () => {
      mockDb.settings._store.set('provider-selection', {
        providerId: 'nonexistent',
        modelId: 'x',
      });
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
        type: 'openai-compatible',
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
        type: 'openai-compatible',
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

    it('auto-selects a provider with no models', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [],
        selectedProviderId: null,
        selectedModelId: null,
      });

      const result = await getState().addProvider({
        name: 'New',
        type: 'openai-compatible',
        baseUrl: 'https://new.api',
        auth: { type: 'none' },
        apiKey: '',
        endpoints: { chat: '/chat' },
        models: [],
        isBuiltIn: false,
      });

      expect(getState().selectedProviderId).toBe(result.id);
      expect(getState().selectedModelId).toBeNull();
    });

    it(`rejects when there are already ${MAX_CUSTOM_PROVIDERS} custom providers`, async () => {
      const customs = Array.from({ length: MAX_CUSTOM_PROVIDERS }, (_, i) =>
        makeProvider({
          id: `c${i}`,
          name: `Custom ${i}`,
          isBuiltIn: false,
        }),
      );
      useProviderStore.setState({
        loaded: true,
        providers: [
          makeProvider({ id: 'b1', name: 'OpenAI', isBuiltIn: true }),
          ...customs,
        ],
        selectedProviderId: 'b1',
        selectedModelId: 'gpt-4',
      });

      await expect(
        getState().addProvider({
          name: 'One too many',
          type: 'openai-compatible',
          baseUrl: 'https://x',
          auth: { type: 'none' },
          apiKey: '',
          endpoints: { chat: '/chat' },
          models: [makeModel({ id: 'm' })],
          isBuiltIn: false,
        }),
      ).rejects.toThrow('MAX_CUSTOM_PROVIDERS');

      expect(mockDb.providers.add).not.toHaveBeenCalled();
    });
  });

  describe('updateProvider', () => {
    it('updates DB and state', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [makeProvider({ id: 'p1', name: 'Old' })],
      });

      await getState().updateProvider('p1', { name: 'Updated' });

      expect(mockDb.providers.update).toHaveBeenCalledWith('p1', {
        name: 'Updated',
      });
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
      const remaining = makeProvider({
        id: 'p2',
        models: [makeModel({ id: 'm2' })],
      });
      useProviderStore.setState({
        loaded: true,
        providers: [makeProvider({ id: 'p1', isBuiltIn: false }), remaining],
        selectedProviderId: 'p1',
        selectedModelId: 'gpt-4',
      });

      await getState().deleteProvider('p1');

      expect(getState().selectedProviderId).toBe('p2');
      expect(getState().selectedModelId).toBe('m2');
      const saved = mockDb.settings._store.get('provider-selection') as {
        providerId: string;
        modelId: string;
      };
      expect(saved.providerId).toBe('p2');
      expect(saved.modelId).toBe('m2');
    });

    it('clears selection when deleting the last selected provider', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [makeProvider({ id: 'p1', isBuiltIn: false })],
        selectedProviderId: 'p1',
        selectedModelId: 'gpt-4',
      });

      await getState().deleteProvider('p1');

      expect(getState().selectedProviderId).toBeNull();
      expect(getState().selectedModelId).toBeNull();
      expect(mockDb.settings._store.get('provider-selection')).toEqual({
        providerId: null,
        modelId: null,
      });
    });

    it('does not persist selection when deleting an unselected provider', async () => {
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

      expect(mockDb.settings.put).not.toHaveBeenCalled();
    });
  });

  describe('selectProvider', () => {
    it('updates selection and persists to IndexedDB', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [
          makeProvider({ id: 'p1', models: [makeModel({ id: 'm1' })] }),
          makeProvider({ id: 'p2', models: [makeModel({ id: 'm2' })] }),
        ],
        selectedProviderId: 'p1',
      });

      getState().selectProvider('p2');
      await vi.waitFor(() => {
        expect(mockDb.settings.put).toHaveBeenCalled();
      });

      expect(getState().selectedProviderId).toBe('p2');
      expect(getState().selectedModelId).toBe('m2');
      const saved = mockDb.settings._store.get('provider-selection') as {
        providerId: string;
        modelId: string;
      };
      expect(saved.providerId).toBe('p2');
    });
  });

  describe('selectModel', () => {
    it('updates model selection and persists', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [
          makeProvider({
            id: 'p1',
            models: [makeModel({ id: 'm1' }), makeModel({ id: 'm2' })],
          }),
        ],
        selectedProviderId: 'p1',
        selectedModelId: 'm1',
      });

      getState().selectModel('m2');
      await vi.waitFor(() => {
        expect(mockDb.settings.put).toHaveBeenCalled();
      });

      expect(getState().selectedModelId).toBe('m2');
      const saved = mockDb.settings._store.get('provider-selection') as {
        providerId: string;
        modelId: string;
      };
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
        providers: [
          makeProvider({
            id: 'p1',
            name: 'OpenAI',
            isBuiltIn: true,
            apiKey: 'old-key',
          }),
        ],
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
        providers: [
          makeProvider({ id: 'p1', name: 'OpenAI', isBuiltIn: true }),
        ],
      });

      await getState().resetProvider('p1');

      expect(getState().providers[0].models).toEqual([]);
    });

    it('skips unknown built-in templates', async () => {
      useProviderStore.setState({
        loaded: true,
        providers: [
          makeProvider({ id: 'p1', name: 'Unknown', isBuiltIn: true }),
        ],
      });

      await getState().resetProvider('p1');

      expect(mockDb.providers.put).not.toHaveBeenCalled();
    });
  });

  describe('resetAllProviders', () => {
    it('removes all providers and re-seeds only builtins', async () => {
      const freshModels = [makeModel({ id: 'new-model' })];
      const geminiModels = [makeModel({ id: 'gemini-2.5-pro' })];
      mockFetchModels.mockImplementation((name: string) =>
        name === 'Google Gemini'
          ? Promise.resolve(geminiModels)
          : Promise.resolve(freshModels),
      );

      useProviderStore.setState({
        loaded: true,
        providers: [
          makeProvider({ id: 'old-openai', name: 'OpenAI', isBuiltIn: true }),
          makeProvider({
            id: 'old-router',
            name: 'OpenRouter',
            isBuiltIn: true,
          }),
          makeProvider({ id: 'custom', name: 'Custom', isBuiltIn: false }),
        ],
      });

      await getState().resetAllProviders();

      expect(mockDb.providers.clear).toHaveBeenCalled();
      expect(mockDb.providers.add).toHaveBeenCalledTimes(4);
      expect(getState().providers.some((p) => p.id === 'custom')).toBe(false);
      expect(getState().providers).toHaveLength(4);
      expect(getState().providers[0].models).toEqual(freshModels);
      expect(
        getState().providers.find((p) => p.name === 'Google Gemini')?.models,
      ).toEqual(geminiModels);
    });

    it('uses empty models when fetching defaults fails', async () => {
      mockFetchModels.mockRejectedValue(new Error('network'));

      await getState().resetAllProviders();

      expect(getState().providers).toHaveLength(4);
      expect(getState().providers.every((p) => p.models.length === 0)).toBe(
        true,
      );
    });
  });

  describe('syncModels', () => {
    it('updates only built-in providers with fetched models', async () => {
      const freshModels = [makeModel({ id: 'fresh' })];
      mockFetchModels.mockResolvedValue(freshModels);
      useProviderStore.setState({
        loaded: true,
        providers: [
          makeProvider({
            id: 'b1',
            name: 'OpenAI',
            isBuiltIn: true,
            models: [makeModel({ source: 'models.dev' })],
          }),
          makeProvider({ id: 'c1', name: 'Custom', isBuiltIn: false }),
        ],
      });

      await getState().syncModels();

      expect(mockDb.providers.update).toHaveBeenCalledWith('b1', {
        models: freshModels,
      });
      expect(getState().providers.find((p) => p.id === 'b1')?.models).toEqual(
        freshModels,
      );
      expect(getState().providers.find((p) => p.id === 'c1')?.models).toEqual([
        makeModel(),
      ]);
    });

    it('syncs Google Gemini built-in models', async () => {
      const geminiModels = [makeModel({ id: 'gemini-2.5-pro' })];
      mockFetchModels.mockImplementation((name: string) =>
        name === 'Google Gemini'
          ? Promise.resolve(geminiModels)
          : Promise.resolve([]),
      );
      useProviderStore.setState({
        loaded: true,
        providers: [
          makeProvider({
            id: 'g1',
            name: 'Google Gemini',
            type: 'google-gemini',
            isBuiltIn: true,
            models: [],
          }),
        ],
      });

      await getState().syncModels();

      expect(mockFetchModels).toHaveBeenCalledWith('Google Gemini');
      expect(mockDb.providers.update).toHaveBeenCalledWith('g1', {
        models: geminiModels,
      });
      expect(getState().providers[0].models).toEqual(geminiModels);
    });

    it('preserves manual models added to built-in providers during sync', async () => {
      const freshModels = [makeModel({ id: 'fresh', source: 'models.dev' })];
      const manualModel = makeModel({ id: 'manual-model', source: 'manual' });
      mockFetchModels.mockResolvedValue(freshModels);
      useProviderStore.setState({
        loaded: true,
        providers: [
          makeProvider({
            id: 'b1',
            name: 'OpenAI',
            isBuiltIn: true,
            models: [manualModel],
          }),
        ],
      });

      await getState().syncModels();

      expect(getState().providers[0].models).toEqual([
        freshModels[0],
        manualModel,
      ]);
      expect(mockDb.providers.update).toHaveBeenCalledWith('b1', {
        models: [freshModels[0], manualModel],
      });
    });

    it('leaves providers unchanged when all model syncs fail', async () => {
      const provider = makeProvider({
        id: 'b1',
        name: 'OpenAI',
        isBuiltIn: true,
      });
      mockFetchModels.mockRejectedValue(new Error('network'));
      useProviderStore.setState({ loaded: true, providers: [provider] });

      await getState().syncModels();

      expect(mockDb.providers.update).not.toHaveBeenCalled();
      expect(getState().providers).toEqual([provider]);
    });

    it('keeps partial model sync successes', async () => {
      const freshModels = [makeModel({ id: 'fresh-openai' })];
      mockFetchModels.mockImplementation((name: string) =>
        name === 'OpenAI'
          ? Promise.resolve(freshModels)
          : Promise.reject(new Error('network')),
      );
      useProviderStore.setState({
        loaded: true,
        providers: [
          makeProvider({
            id: 'b1',
            name: 'OpenAI',
            isBuiltIn: true,
            models: [makeModel({ source: 'models.dev' })],
          }),
          makeProvider({
            id: 'b2',
            name: 'Anthropic',
            isBuiltIn: true,
            models: [makeModel({ source: 'models.dev' })],
          }),
        ],
      });

      await getState().syncModels();

      expect(mockDb.providers.update).toHaveBeenCalledTimes(1);
      expect(mockDb.providers.update).toHaveBeenCalledWith('b1', {
        models: freshModels,
      });
      expect(getState().providers.find((p) => p.id === 'b1')?.models).toEqual(
        freshModels,
      );
      expect(getState().providers.find((p) => p.id === 'b2')?.models).toEqual([
        makeModel({ source: 'models.dev' }),
      ]);
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
