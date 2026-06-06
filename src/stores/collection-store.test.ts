import { useCollectionStore } from './collection-store';
import { useComposerStore } from './composer-store';
import { useProviderStore } from './provider-store';
import { makeProvider } from '@/__tests__/fixtures';
import type { Collection, SavedRequest } from '@/types/history';

const { mockDb, nanoidCount } = vi.hoisted(() => {
  const mockDb = {
    collections: {
      toArray: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(undefined),
      add: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    savedRequests: {
      toArray: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue(undefined),
      bulkAdd: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      where: vi.fn(),
    },
    transaction: vi.fn(),
  };
  const nanoidCount = { value: 0 };
  return { mockDb, nanoidCount };
});

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => `collection-id-${++nanoidCount.value}`),
}));

vi.mock('@/db', () => ({ db: mockDb }));

function makeCollection(overrides?: Partial<Collection>): Collection {
  return {
    id: 'collection-1',
    name: 'My Collection',
    sortOrder: 0,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeSavedRequest(overrides?: Partial<SavedRequest>): SavedRequest {
  return {
    id: 'saved-1',
    collectionId: 'collection-1',
    name: 'Saved Request',
    providerId: 'provider-1',
    providerName: 'TestProvider',
    modelId: 'gpt-4',
    request: {
      messages: [],
      systemPrompt: '',
      temperature: 1,
      maxTokens: 4096,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      stream: false,
    },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('collection-store', () => {
  const getState = () => useCollectionStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    nanoidCount.value = 0;
    useCollectionStore.setState({
      collections: [],
      savedRequests: [],
      loaded: false,
    });
    useComposerStore.setState({
      activeCollectionId: null,
      activeSavedRequestId: null,
    });
    useProviderStore.setState({
      providers: [makeProvider()],
      selectedProviderId: 'test-provider',
      selectedModelId: 'gpt-4',
    });
    mockDb.collections.toArray.mockResolvedValue([]);
    mockDb.savedRequests.toArray.mockResolvedValue([]);
    mockDb.transaction.mockImplementation(async (...args: unknown[]) => {
      const callback = args[args.length - 1] as () => Promise<void>;
      await callback();
    });
    mockDb.savedRequests.where.mockReturnValue({
      equals: vi.fn().mockReturnValue({
        delete: vi.fn().mockResolvedValue(undefined),
        toArray: vi.fn().mockResolvedValue([]),
      }),
    });
  });

  describe('load', () => {
    it('loads collections and saved requests from DB', async () => {
      const collections = [
        makeCollection({ id: 'b', name: 'Beta', sortOrder: 1 }),
        makeCollection({ id: 'a', name: 'Alpha', sortOrder: 0 }),
      ];
      const savedRequests = [
        makeSavedRequest({ id: 'old', updatedAt: new Date('2026-01-01') }),
        makeSavedRequest({ id: 'new', updatedAt: new Date('2026-02-01') }),
      ];
      mockDb.collections.toArray.mockResolvedValue(collections);
      mockDb.savedRequests.toArray.mockResolvedValue(savedRequests);

      await getState().load();

      expect(getState().loaded).toBe(true);
      expect(getState().collections.map((c) => c.id)).toEqual(['a', 'b']);
      expect(getState().savedRequests.map((r) => r.id)).toEqual(['new', 'old']);
    });

    it('is idempotent when already loaded', async () => {
      useCollectionStore.setState({ loaded: true });
      await getState().load();
      expect(mockDb.collections.toArray).not.toHaveBeenCalled();
    });
  });

  describe('addCollection', () => {
    it('persists and appends a sorted collection', async () => {
      useCollectionStore.setState({
        collections: [makeCollection({ id: 'existing', sortOrder: 0 })],
      });

      const result = await getState().addCollection('  New Collection  ');

      expect(result.id).toBe('collection-id-1');
      expect(result.name).toBe('New Collection');
      expect(mockDb.collections.add).toHaveBeenCalledWith(result);
      expect(getState().collections).toHaveLength(2);
      expect(getState().collections[1].name).toBe('New Collection');
    });

    it('rejects empty names', async () => {
      await expect(getState().addCollection('   ')).rejects.toThrow(
        'COLLECTION_NAME_REQUIRED',
      );
    });

    it('rolls back state when DB add fails', async () => {
      const existing = [makeCollection()];
      useCollectionStore.setState({ collections: existing });
      mockDb.collections.add.mockRejectedValueOnce(new Error('db failed'));

      await expect(getState().addCollection('New')).rejects.toThrow(
        'db failed',
      );
      expect(getState().collections).toEqual(existing);
    });
  });

  describe('renameCollection', () => {
    it('updates DB and state', async () => {
      useCollectionStore.setState({
        collections: [makeCollection({ id: 'c1', name: 'Old Name' })],
      });

      await getState().renameCollection('c1', '  New Name  ');

      expect(mockDb.collections.update).toHaveBeenCalledWith('c1', {
        name: 'New Name',
      });
      expect(getState().collections[0].name).toBe('New Name');
    });
  });

  describe('deleteCollection', () => {
    it('removes collection and its saved requests', async () => {
      useCollectionStore.setState({
        collections: [
          makeCollection({ id: 'c1' }),
          makeCollection({ id: 'c2', name: 'Other' }),
        ],
        savedRequests: [
          makeSavedRequest({ id: 'r1', collectionId: 'c1' }),
          makeSavedRequest({ id: 'r2', collectionId: 'c2' }),
        ],
      });

      await getState().deleteCollection('c1');

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(getState().collections.map((c) => c.id)).toEqual(['c2']);
      expect(getState().savedRequests.map((r) => r.id)).toEqual(['r2']);
    });
  });

  describe('saveCurrentRequest', () => {
    it('saves composer snapshot and updates context', async () => {
      useCollectionStore.setState({
        collections: [makeCollection({ id: 'c1' })],
      });

      const result = await getState().saveCurrentRequest(
        'c1',
        '  My Request  ',
      );

      expect(result.name).toBe('My Request');
      expect(result.collectionId).toBe('c1');
      expect(mockDb.savedRequests.add).toHaveBeenCalledWith(result);
      expect(getState().savedRequests).toHaveLength(1);
      expect(useComposerStore.getState().activeCollectionId).toBe('c1');
      expect(useComposerStore.getState().activeSavedRequestId).toBe(result.id);
    });

    it('requires a selected provider', async () => {
      useProviderStore.setState({
        providers: [],
        selectedProviderId: null,
        selectedModelId: null,
      });

      await expect(
        getState().saveCurrentRequest('c1', 'Request'),
      ).rejects.toThrow('PROVIDER_REQUIRED');
    });
  });

  describe('deleteSavedRequest', () => {
    it('clears composer context when deleting the active saved request', async () => {
      useCollectionStore.setState({
        savedRequests: [makeSavedRequest({ id: 'active' })],
      });
      useComposerStore.setState({
        activeCollectionId: 'collection-1',
        activeSavedRequestId: 'active',
      });

      await getState().deleteSavedRequest('active');

      expect(mockDb.savedRequests.delete).toHaveBeenCalledWith('active');
      expect(getState().savedRequests).toEqual([]);
      expect(useComposerStore.getState().activeSavedRequestId).toBeNull();
      expect(useComposerStore.getState().activeCollectionId).toBeNull();
    });
  });
});
