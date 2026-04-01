import { renderHook } from '@testing-library/react';
import { useHistory } from './use-history';
import { useHistoryStore } from '@/stores/history-store';

// Mock db since history-store imports it
const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    history: {
      orderBy: vi.fn().mockReturnValue({
        reverse: vi
          .fn()
          .mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
      }),
      add: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
  },
}));
vi.mock('@/db', () => ({ db: mockDb }));

describe('useHistory', () => {
  beforeEach(() => {
    useHistoryStore.setState({ entries: [], loaded: false });
  });

  it('calls load when not loaded', () => {
    const loadSpy = vi.fn();
    useHistoryStore.setState({ load: loadSpy, loaded: false });

    renderHook(() => useHistory());

    expect(loadSpy).toHaveBeenCalled();
  });

  it('does not call load when already loaded', () => {
    const loadSpy = vi.fn();
    useHistoryStore.setState({ load: loadSpy, loaded: true });

    renderHook(() => useHistory());

    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('returns the store', () => {
    useHistoryStore.setState({ loaded: true });
    const { result } = renderHook(() => useHistory());
    expect(result.current.entries).toBeDefined();
  });
});
