const { isTauriMock, tauriFetchMock, getProxyConfigMock } = vi.hoisted(() => ({
  isTauriMock: vi.fn(),
  tauriFetchMock: vi.fn(),
  getProxyConfigMock: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({ isTauri: isTauriMock }));
vi.mock('@tauri-apps/plugin-http', () => ({ fetch: tauriFetchMock }));
vi.mock('@/stores/proxy-store', () => ({
  getProxyConfig: getProxyConfigMock,
}));

import {
  buildTauriProxy,
  runtimeFetch,
  shouldUseTauriHttpClient,
} from './runtime-fetch';
import {
  DEV_HTTP_PROXY_HEADER,
  DEV_HTTPS_PROXY_HEADER,
  DEV_NO_PROXY_HEADER,
} from '@/dev/proxy-headers';

const CONFIG = {
  httpProxy: 'http://http-proxy.test:8080',
  httpsProxy: 'http://https-proxy.test:8443',
  noProxy: 'localhost,.internal.test',
};

describe('runtimeFetch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isTauriMock.mockReturnValue(false);
    getProxyConfigMock.mockResolvedValue(CONFIG);
    tauriFetchMock.mockResolvedValue(new Response('{}'));
  });

  it('detects Tauri in development and production alike', () => {
    isTauriMock.mockReturnValue(true);
    expect(shouldUseTauriHttpClient()).toBe(true);
  });

  it('builds scheme-specific Tauri proxy settings with NO_PROXY', () => {
    expect(buildTauriProxy(CONFIG)).toEqual({
      http: { url: CONFIG.httpProxy, noProxy: CONFIG.noProxy },
      https: { url: CONFIG.httpsProxy, noProxy: CONFIG.noProxy },
    });
  });

  it('uses HTTP_PROXY as the HTTPS fallback when HTTPS_PROXY is empty', () => {
    expect(buildTauriProxy({ ...CONFIG, httpsProxy: '' })).toEqual({
      all: { url: CONFIG.httpProxy, noProxy: CONFIG.noProxy },
    });
  });

  it('passes the persisted proxy configuration to streamed Tauri fetches', async () => {
    isTauriMock.mockReturnValue(true);
    const signal = new AbortController().signal;

    await runtimeFetch('https://api.example.test/v1/chat', {
      method: 'POST',
      signal,
    });

    expect(tauriFetchMock).toHaveBeenCalledWith(
      'https://api.example.test/v1/chat',
      expect.objectContaining({
        method: 'POST',
        signal,
        proxy: buildTauriProxy(CONFIG),
      }),
    );
  });

  it('routes browser development traffic through the local relay', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}'));

    await runtimeFetch('https://models.dev/api.json');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/proxy?url=https%3A%2F%2Fmodels.dev%2Fapi.json');
    const headers = new Headers(init?.headers);
    expect(headers.get(DEV_HTTP_PROXY_HEADER)).toBe(CONFIG.httpProxy);
    expect(headers.get(DEV_HTTPS_PROXY_HEADER)).toBe(CONFIG.httpsProxy);
    expect(headers.get(DEV_NO_PROXY_HEADER)).toBe(CONFIG.noProxy);
  });
});
