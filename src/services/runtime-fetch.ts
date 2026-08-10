import { isTauri } from '@tauri-apps/api/core';
import {
  fetch as tauriFetch,
  type Proxy as TauriProxy,
} from '@tauri-apps/plugin-http';
import { getProxyConfig, type ProxyConfig } from '@/stores/proxy-store';
import {
  DEV_HTTP_PROXY_HEADER,
  DEV_HTTPS_PROXY_HEADER,
  DEV_NO_PROXY_HEADER,
} from '@/dev/proxy-headers';

export function shouldUseTauriHttpClient(): boolean {
  return isTauri();
}

export function buildTauriProxy(config: ProxyConfig): TauriProxy | undefined {
  const proxy: TauriProxy = {};
  if (config.httpProxy) {
    const httpConfig = {
      url: config.httpProxy,
      noProxy: config.noProxy || undefined,
    };
    if (config.httpsProxy) proxy.http = httpConfig;
    else proxy.all = httpConfig;
  }
  if (config.httpsProxy) {
    proxy.https = {
      url: config.httpsProxy,
      noProxy: config.noProxy || undefined,
    };
  }
  return proxy.all || proxy.http || proxy.https ? proxy : undefined;
}

function getDevProxyUrl(input: URL | Request | string): string | null {
  const rawUrl =
    input instanceof Request
      ? input.url
      : input instanceof URL
        ? input.href
        : input;
  if (rawUrl.startsWith('/api/proxy?')) return rawUrl;
  try {
    const url = new URL(rawUrl);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return `/api/proxy?url=${encodeURIComponent(url.href)}`;
    }
  } catch {
    // Relative application requests should continue through browser fetch.
  }
  return null;
}

function withDevProxyHeaders(
  init: RequestInit | undefined,
  config: ProxyConfig,
): RequestInit {
  const headers = new Headers(init?.headers);
  if (config.httpProxy) headers.set(DEV_HTTP_PROXY_HEADER, config.httpProxy);
  if (config.httpsProxy) headers.set(DEV_HTTPS_PROXY_HEADER, config.httpsProxy);
  if (config.noProxy) headers.set(DEV_NO_PROXY_HEADER, config.noProxy);
  return { ...init, headers };
}

export async function runtimeFetch(
  input: URL | Request | string,
  init?: RequestInit,
): Promise<Response> {
  const config = await getProxyConfig();
  if (shouldUseTauriHttpClient()) {
    return tauriFetch(input, { ...init, proxy: buildTauriProxy(config) });
  }

  if (import.meta.env.DEV) {
    const devProxyUrl = getDevProxyUrl(input);
    if (devProxyUrl) {
      return fetch(devProxyUrl, withDevProxyHeaders(init, config));
    }
  }

  return fetch(input, init);
}
