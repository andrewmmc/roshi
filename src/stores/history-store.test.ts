import { useHistoryStore } from './history-store';
import { makeHistoryEntry } from '@/__tests__/fixtures';

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'mock-history-id'),
}));

const { mockDb } = vi.hoisted(() => {
  const mockDb = {
    history: {
      orderBy: vi.fn(),
      add: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
  };
  return { mockDb };
});

vi.mock('@/db', () => ({ db: mockDb }));

function setupOrderByChain(entries: unknown[] = []) {
  mockDb.history.orderBy.mockReturnValue({
    reverse: vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue(entries),
    }),
  });
}

describe('history-store', () => {
  const getState = () => useHistoryStore.getState();

  beforeEach(() => {
    vi.clearAllMocks();
    useHistoryStore.setState({ entries: [], loaded: false });
    setupOrderByChain();
  });

  describe('load', () => {
    it('loads entries from DB and sets loaded', async () => {
      const entries = [makeHistoryEntry({ id: '1' }), makeHistoryEntry({ id: '2' })];
      setupOrderByChain(entries);

      await getState().load();

      expect(getState().entries).toEqual(entries);
      expect(getState().loaded).toBe(true);
      expect(mockDb.history.orderBy).toHaveBeenCalledWith('createdAt');
    });
  });

  describe('addEntry', () => {
    it('creates entry with id and timestamp, prepends to state', async () => {
      const existing = makeHistoryEntry({ id: 'existing' });
      useHistoryStore.setState({ entries: [existing] });

      const result = await getState().addEntry({
        providerId: 'p1',
        providerName: 'TestProvider',
        modelId: 'gpt-4',
        request: { messages: [], model: 'gpt-4', stream: false },
        customHeaders: [{ key: 'X-Test', value: 'value' }],
        rawRequest: {},
        response: null,
        rawResponse: null,
        error: null,
        durationMs: 100,
        statusCode: 200,
      });

      expect(result.id).toBe('mock-history-id');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.customHeaders).toEqual([{ key: 'X-Test', value: 'value' }]);
      expect(mockDb.history.add).toHaveBeenCalledWith(result);
      expect(getState().entries[0].id).toBe('mock-history-id');
      expect(getState().entries[1].id).toBe('existing');
    });
  });

  describe('deleteEntry', () => {
    it('removes entry from DB and state', async () => {
      useHistoryStore.setState({
        entries: [makeHistoryEntry({ id: 'a' }), makeHistoryEntry({ id: 'b' })],
      });

      await getState().deleteEntry('a');

      expect(mockDb.history.delete).toHaveBeenCalledWith('a');
      expect(getState().entries).toHaveLength(1);
      expect(getState().entries[0].id).toBe('b');
    });
  });

  describe('clearAll', () => {
    it('clears DB and empties state', async () => {
      useHistoryStore.setState({
        entries: [makeHistoryEntry({ id: 'a' })],
      });

      await getState().clearAll();

      expect(mockDb.history.clear).toHaveBeenCalled();
      expect(getState().entries).toEqual([]);
    });
  });
});
