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

  it('deletes application data and clears local storage', async () => {
    const clear = vi.fn();
    vi.stubGlobal('localStorage', { clear });

    await resetApplication();

    expect(deleteDatabase).toHaveBeenCalledOnce();
    expect(clear).toHaveBeenCalledOnce();
  });

  it('resets providers through the provider store', async () => {
    await resetProviders();

    expect(resetAllProviders).toHaveBeenCalledOnce();
  });
});
