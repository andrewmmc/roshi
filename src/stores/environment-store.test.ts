import { renderHook } from '@testing-library/react';
import {
  useEnvironmentStore,
  useSelectedEnvironment,
} from './environment-store';
import type { Environment } from '@/types/history';

const { mockDb, nanoidCount } = vi.hoisted(() => {
  const settingsStore = new Map<string, unknown>();
  const mockDb = {
    environments: {
      toArray: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    settings: {
      get: vi.fn(async (key: string) => {
        const value = settingsStore.get(key);
        return value !== undefined ? { key, value } : undefined;
      }),
      put: vi.fn(async (entry: { key: string; value: unknown }) => {
        settingsStore.set(entry.key, entry.value);
      }),
      _store: settingsStore,
    },
  };
  const nanoidCount = { value: 0 };
  return { mockDb, nanoidCount };
});

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => `env-id-${++nanoidCount.value}`),
}));

vi.mock('@/db', () => ({ db: mockDb }));

function makeEnvironment(overrides?: Partial<Environment>): Environment {
  return {
    id: 'env-1',
    name: 'Development',
    variables: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('environment-store', () => {
  const getState = () => useEnvironmentStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    nanoidCount.value = 0;
    mockDb.settings._store.clear();
    useEnvironmentStore.setState({
      environments: [],
      selectedEnvironmentId: null,
      loaded: false,
    });
    mockDb.environments.toArray.mockResolvedValue([]);
  });

  describe('load', () => {
    it('loads environments and restores valid selection', async () => {
      const environments = [
        makeEnvironment({ id: 'env-b', name: 'Beta' }),
        makeEnvironment({ id: 'env-a', name: 'Alpha' }),
      ];
      mockDb.environments.toArray.mockResolvedValue(environments);
      mockDb.settings._store.set('environment-selection', 'env-a');

      await getState().load();

      expect(getState().loaded).toBe(true);
      expect(getState().environments.map((e) => e.id)).toEqual([
        'env-a',
        'env-b',
      ]);
      expect(getState().selectedEnvironmentId).toBe('env-a');
    });

    it('clears invalid persisted selection', async () => {
      mockDb.environments.toArray.mockResolvedValue([
        makeEnvironment({ id: 'env-1' }),
      ]);
      mockDb.settings._store.set('environment-selection', 'missing');

      await getState().load();

      expect(getState().selectedEnvironmentId).toBeNull();
      expect(mockDb.settings.put).toHaveBeenCalledWith({
        key: 'environment-selection',
        value: null,
      });
    });
  });

  describe('addEnvironment', () => {
    it('persists and selects the first environment', async () => {
      const result = await getState().addEnvironment('  Staging  ');

      expect(result.id).toBe('env-id-1');
      expect(result.name).toBe('Staging');
      expect(mockDb.environments.add).toHaveBeenCalledWith(result);
      expect(getState().environments).toHaveLength(1);
      expect(getState().selectedEnvironmentId).toBe('env-id-1');
      expect(mockDb.settings.put).toHaveBeenCalledWith({
        key: 'environment-selection',
        value: 'env-id-1',
      });
    });

    it('does not change selection when one is already selected', async () => {
      useEnvironmentStore.setState({
        selectedEnvironmentId: 'existing',
        environments: [makeEnvironment({ id: 'existing' })],
      });

      await getState().addEnvironment('QA');

      expect(getState().selectedEnvironmentId).toBe('existing');
    });

    it('rejects empty names', async () => {
      await expect(getState().addEnvironment('  ')).rejects.toThrow(
        'ENVIRONMENT_NAME_REQUIRED',
      );
    });
  });

  describe('updateEnvironment', () => {
    it('normalizes variables and updates state', async () => {
      useEnvironmentStore.setState({
        environments: [makeEnvironment({ id: 'env-1', name: 'Old' })],
      });

      await getState().updateEnvironment('env-1', {
        name: '  Production  ',
        variables: [
          { id: '', key: ' API_KEY ', value: 'secret' },
          { id: 'var-2', key: '  ', value: 'ignored' },
        ],
      });

      expect(mockDb.environments.update).toHaveBeenCalledWith(
        'env-1',
        expect.objectContaining({
          name: 'Production',
          variables: [{ id: 'env-id-1', key: 'API_KEY', value: 'secret' }],
        }),
      );
      expect(getState().environments[0].name).toBe('Production');
      expect(getState().environments[0].variables).toEqual([
        { id: 'env-id-1', key: 'API_KEY', value: 'secret' },
      ]);
    });
  });

  describe('deleteEnvironment', () => {
    it('selects the next environment when deleting the active one', async () => {
      useEnvironmentStore.setState({
        environments: [
          makeEnvironment({ id: 'env-1', name: 'Alpha' }),
          makeEnvironment({ id: 'env-2', name: 'Beta' }),
        ],
        selectedEnvironmentId: 'env-1',
      });

      await getState().deleteEnvironment('env-1');

      expect(mockDb.environments.delete).toHaveBeenCalledWith('env-1');
      expect(getState().environments.map((e) => e.id)).toEqual(['env-2']);
      expect(getState().selectedEnvironmentId).toBe('env-2');
      expect(mockDb.settings.put).toHaveBeenCalledWith({
        key: 'environment-selection',
        value: 'env-2',
      });
    });
  });

  describe('selectEnvironment', () => {
    it('updates state and persists selection', async () => {
      useEnvironmentStore.setState({
        environments: [makeEnvironment({ id: 'env-1' })],
      });

      getState().selectEnvironment('env-1');
      await vi.waitFor(() => {
        expect(mockDb.settings.put).toHaveBeenCalledWith({
          key: 'environment-selection',
          value: 'env-1',
        });
      });

      expect(getState().selectedEnvironmentId).toBe('env-1');
    });
  });

  describe('useSelectedEnvironment', () => {
    it('returns the selected environment object', () => {
      const environment = makeEnvironment({ id: 'env-1', name: 'Dev' });
      useEnvironmentStore.setState({
        environments: [environment],
        selectedEnvironmentId: 'env-1',
      });

      const { result } = renderHook(() => useSelectedEnvironment());
      expect(result.current).toEqual(environment);
    });
  });
});
