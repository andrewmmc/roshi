const { settingsStore, settingsGet, settingsPut } = vi.hoisted(() => {
  const settingsStore = new Map<string, unknown>();
  return {
    settingsStore,
    settingsGet: vi.fn(async (key: string) => {
      const value = settingsStore.get(key);
      return value === undefined ? undefined : { key, value };
    }),
    settingsPut: vi.fn(async (entry: { key: string; value: unknown }) => {
      settingsStore.set(entry.key, entry.value);
    }),
  };
});

vi.mock('@/db', () => ({
  db: { settings: { get: settingsGet, put: settingsPut } },
}));

import {
  getProxyConfig,
  PROXY_SETTING_KEY,
  useProxyStore,
} from './proxy-store';

describe('proxy-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsStore.clear();
    useProxyStore.setState({
      httpProxy: '',
      httpsProxy: '',
      noProxy: '',
      loaded: false,
    });
  });

  it('loads and normalizes persisted proxy settings', async () => {
    settingsStore.set(PROXY_SETTING_KEY, {
      httpProxy: ' http://proxy.test:8080 ',
      httpsProxy: 'http://secure-proxy.test:8443',
      noProxy: ' localhost,.internal.test ',
    });

    expect(await getProxyConfig()).toEqual({
      httpProxy: 'http://proxy.test:8080',
      httpsProxy: 'http://secure-proxy.test:8443',
      noProxy: 'localhost,.internal.test',
    });
    expect(useProxyStore.getState().loaded).toBe(true);
  });

  it('persists changes before making them active', async () => {
    const config = {
      httpProxy: 'http://proxy.test:8080',
      httpsProxy: '',
      noProxy: 'localhost',
    };

    await useProxyStore.getState().save(config);

    expect(settingsPut).toHaveBeenCalledWith({
      key: PROXY_SETTING_KEY,
      value: config,
    });
    expect(await getProxyConfig()).toEqual(config);
  });
});
