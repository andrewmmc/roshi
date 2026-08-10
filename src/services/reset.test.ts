import { resetApplication, resetProviders } from './reset';

const { deleteDatabase, resetAllProviders } = vi.hoisted(() => ({
  deleteDatabase: vi.fn<() => Promise<void>>(),
  resetAllProviders: vi.fn<() => Promise<void>>(),
}));

vi.mock('@/db', () => ({
  db: { delete: deleteDatabase },
}));

vi.mock('@/stores/provider-store', () => ({
  useProviderStore: {
    getState: () => ({ resetAllProviders }),
  },
}));

describe('reset service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteDatabase.mockResolvedValue(undefined);
    resetAllProviders.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('deletes application data without clearing unrelated origin storage', async () => {
    const values = new Map([
      ['llm-tester-theme', 'dark'],
      ['other-app-session', 'keep'],
      ['llm-tester-models-cache', '{}'],
    ]);
    const removeItem = vi.fn((key: string) => values.delete(key));
    vi.stubGlobal('localStorage', {
      get length() {
        return values.size;
      },
      key: (index: number) => [...values.keys()][index] ?? null,
      removeItem,
      clear: vi.fn(() => values.clear()),
    });

    await resetApplication();

    expect(deleteDatabase).toHaveBeenCalledOnce();
    expect(removeItem).toHaveBeenCalledWith('llm-tester-theme');
    expect(removeItem).toHaveBeenCalledWith('llm-tester-models-cache');
    expect(removeItem).not.toHaveBeenCalledWith('other-app-session');
  });

  it('resets providers through the provider store', async () => {
    await resetProviders();

    expect(resetAllProviders).toHaveBeenCalledOnce();
  });
});
