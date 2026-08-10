import { create } from 'zustand';
import { createLoadGuard, loadSetting, persistSetting } from './store-helpers';

export const PROXY_SETTING_KEY = 'network-proxy';

export interface ProxyConfig {
  httpProxy: string;
  httpsProxy: string;
  noProxy: string;
}

const EMPTY_PROXY_CONFIG: ProxyConfig = {
  httpProxy: '',
  httpsProxy: '',
  noProxy: '',
};

interface ProxyStore extends ProxyConfig {
  loaded: boolean;
  load: () => Promise<void>;
  save: (config: ProxyConfig) => Promise<void>;
}

const loadGuard = createLoadGuard();

function normalizeConfig(value: unknown): ProxyConfig {
  if (!value || typeof value !== 'object') return EMPTY_PROXY_CONFIG;
  const config = value as Partial<ProxyConfig>;
  return {
    httpProxy:
      typeof config.httpProxy === 'string' ? config.httpProxy.trim() : '',
    httpsProxy:
      typeof config.httpsProxy === 'string' ? config.httpsProxy.trim() : '',
    noProxy: typeof config.noProxy === 'string' ? config.noProxy.trim() : '',
  };
}

export const useProxyStore = create<ProxyStore>((set, get) => ({
  ...EMPTY_PROXY_CONFIG,
  loaded: false,
  load: () =>
    loadGuard.run(
      () => get().loaded,
      async () => {
        const config = normalizeConfig(
          await loadSetting<ProxyConfig>(PROXY_SETTING_KEY),
        );
        set({ ...config, loaded: true });
      },
    ),
  save: async (config) => {
    const normalized = normalizeConfig(config);
    await persistSetting(PROXY_SETTING_KEY, normalized);
    set({ ...normalized, loaded: true });
  },
}));

export async function getProxyConfig(): Promise<ProxyConfig> {
  await useProxyStore.getState().load();
  const { httpProxy, httpsProxy, noProxy } = useProxyStore.getState();
  return { httpProxy, httpsProxy, noProxy };
}
