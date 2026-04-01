import { renderHook } from '@testing-library/react';
import { useProviders } from './use-providers';
import { useProviderStore } from '@/stores/provider-store';

// Mock db and models-api since provider-store imports them
const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    providers: {
      toArray: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    },
  },
}));
vi.mock('@/db', () => ({ db: mockDb }));
vi.mock('@/services/models-api', () => ({
  fetchModelsForProvider: vi.fn().mockResolvedValue([]),
}));

describe('useProviders', () => {
  beforeEach(() => {
    useProviderStore.setState({
      providers: [],
      selectedProviderId: null,
      selectedModelId: null,
      loaded: false,
    });
  });

  it('calls load when not loaded', () => {
    const loadSpy = vi.fn();
    useProviderStore.setState({ load: loadSpy, loaded: false });

    renderHook(() => useProviders());

    expect(loadSpy).toHaveBeenCalled();
  });

  it('does not call load when already loaded', () => {
    const loadSpy = vi.fn();
    useProviderStore.setState({ load: loadSpy, loaded: true });

    renderHook(() => useProviders());

    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('returns the store', () => {
    useProviderStore.setState({ loaded: true });
    const { result } = renderHook(() => useProviders());
    expect(result.current.providers).toBeDefined();
  });
});
